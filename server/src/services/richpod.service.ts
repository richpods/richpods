import { db, RICHPODS_COLLECTION, CHAPTERS_SUBCOLLECTION } from "../config/firestore.js";
import { DocumentReference, FieldValue } from "@google-cloud/firestore";
import { getEnclosure } from "./storage.service.js";
import { getUserById, getUserReference } from "./user.service.js";
import { fetchAndValidateFeed, storeFeedInGCS } from "./feed.service.js";
import { resolveRichPodVerificationStatus } from "./verification.service.js";
import type {
    ChapterDocument,
    Chapter,
    Enclosure,
    EnclosureTypeValue,
    RichPodDocument,
    PodcastOrigin,
    UserRoleValue,
} from "../types/firestore.js";
import { EnclosureType, RichPodState as FirestoreRichPodState, RichPodStateType } from "../types/firestore.js";
import { RichPodState, ChartFormat, CardType as GraphQLCardType } from "../graphql.js";
import { syncHostedEpisodePublishState } from "./hosted-episode.service.js";
import type {
    Chapter as GraphQLChapter,
    Enclosure as GraphQLEnclosure,
    RichPod,
    User,
} from "../graphql.js";
import { isPrivilegedRole } from "@richpods/shared/utils/roles";
import type { PaginatedResult } from "../utils/pagination.js";
import { ValidationError } from "../validation/validator.js";

/**
 * Get paginated RichPods for a user.
 *
 * @param userId the user id.
 * @param pageSize number of items per page.
 * @param afterCursor optional cursor (document ID) to start after.
 * @param stateFilter optional state filter ("draft" or "published").
 * @returns paginated result of RichPods owned by the user.
 */
export async function getUserRichPods(
    userId: string,
    pageSize: number,
    afterCursor?: string | null,
    stateFilter?: string | null,
): Promise<PaginatedResult<RichPod>> {
    const userRef = getUserReference(userId);

    let baseQuery = db
        .collection(RICHPODS_COLLECTION)
        .where("editor", "==", userRef);

    if (stateFilter === "draft") {
        baseQuery = baseQuery.where("state", "==", FirestoreRichPodState.DRAFT);
    } else if (stateFilter === "published") {
        baseQuery = baseQuery.where("state", "==", FirestoreRichPodState.PUBLISHED);
    } else {
        baseQuery = baseQuery.where("state", "in", [FirestoreRichPodState.PUBLISHED, FirestoreRichPodState.DRAFT]);
    }

    let orderedQuery = baseQuery.orderBy("updatedAt", "desc").limit(pageSize + 1);

    if (afterCursor) {
        const cursorDoc = await db.collection(RICHPODS_COLLECTION).doc(afterCursor).get();
        if (!cursorDoc.exists) {
            throw new ValidationError("Validation failed for after", ["after: invalid or stale cursor"]);
        }
        orderedQuery = orderedQuery.startAfter(cursorDoc);
    }

    const snapshot = await orderedQuery.get();
    const hasNextPage = snapshot.docs.length > pageSize;
    const docs = hasNextPage ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

    const items: RichPod[] = [];
    for (const doc of docs) {
        const data = doc.data() as RichPodDocument;
        const editor = await getUserById(data.editor.id, false);
        if (!editor) {
            console.error(`Editor not found for RichPod ${doc.id}`);
            continue;
        }

        items.push(mapToGraphQL(doc.id, data, [], editor));
    }

    const nextCursor = hasNextPage && docs.length > 0 ? docs[docs.length - 1].id : null;

    return { items, nextCursor };
}

/**
 * Get recently published RichPods for public display with cursor pagination.
 *
 * @param pageSize number of items per page.
 * @param afterCursor optional cursor (document ID) to start after.
 * @returns paginated result of published RichPods ordered by creation date descending.
 */
export async function getRecentPublishedRichPods(
    pageSize: number,
    afterCursor?: string | null,
): Promise<PaginatedResult<RichPod>> {
    let query = db
        .collection(RICHPODS_COLLECTION)
        .where("state", "==", FirestoreRichPodState.PUBLISHED)
        .orderBy("createdAt", "desc")
        .limit(pageSize + 1);

    if (afterCursor) {
        const cursorDoc = await db.collection(RICHPODS_COLLECTION).doc(afterCursor).get();
        if (!cursorDoc.exists) {
            throw new ValidationError("Validation failed for after", ["after: invalid or stale cursor"]);
        }
        query = query.startAfter(cursorDoc);
    }

    const snapshot = await query.get();
    const hasNextPage = snapshot.docs.length > pageSize;
    const docs = hasNextPage ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

    const items: RichPod[] = [];
    for (const doc of docs) {
        const data = doc.data() as RichPodDocument;
        const editor = await getUserById(data.editor.id, false);
        if (!editor) {
            console.error(`Editor not found for RichPod ${doc.id}`);
            continue;
        }

        items.push(mapToGraphQL(doc.id, data, [], editor));
    }

    const nextCursor = hasNextPage && docs.length > 0 ? docs[docs.length - 1].id : null;

    return { items, nextCursor };
}

/**
 * Get a RichPod by id.
 *
 * @param id the RichPod id.
 * @param states arrays of allowed states; deleted RichPods will never be returned.
 * @param requestingUserId
 */
export async function getRichPodById(
    id: string,
    states: RichPodStateType[],
    requestingUserId?: string,
): Promise<RichPod | null> {
    const doc = await db.collection(RICHPODS_COLLECTION).doc(id).get();

    if (!doc.exists) {
        return null;
    }

    const data = doc.data() as RichPodDocument;

    if (data.state === FirestoreRichPodState.DELETED) {
        return null;
    }

    if (states && !states.includes(data.state)) {
        return null;
    }

    // Draft RichPods are only accessible to their owner
    if (data.state === FirestoreRichPodState.DRAFT) {
        if (!requestingUserId || requestingUserId !== data.editor.id) {
            return null;
        }
    }

    const editor = await getUserById(data.editor.id, false);
    if (!editor) {
        throw new Error(`Editor not found for RichPod ${id}`);
    }

    return mapToGraphQL(id, data, await getChaptersForRichPod(id, data.origin), editor);
}

/**
 * Input type for creating a RichPod (without gcsFeedName which is added during creation)
 */
type CreateRichPodInput = {
    title: string;
    description: string;
    state: RichPodStateType;
    origin: Omit<PodcastOrigin, "gcsFeedName" | "verified">;
};

/**
 * Create a new RichPod.
 */
export async function createRichPod(
    richPod: CreateRichPodInput,
    editorUserId: string,
): Promise<RichPod> {
    // First, fetch and validate the RSS feed
    const feedContent = await fetchAndValidateFeed(
        richPod.origin.feedUrl,
        richPod.origin.episode.guid,
    );

    // Resolve verification status at creation time
    const verificationStatus = await resolveRichPodVerificationStatus(
        editorUserId,
        richPod.origin.feedUrl,
    );
    const verified = verificationStatus === "verified";

    // Create a new document reference to get the ID
    const docRef = db.collection(RICHPODS_COLLECTION).doc();
    const richPodId = docRef.id;

    // Snapshot of the XML feed at the time of the RichPod creation
    const gcsFeedName = await storeFeedInGCS(richPodId, richPod.origin.feedUrl, feedContent);

    const docData = {
        ...richPod,
        origin: {
            ...richPod.origin,
            gcsFeedName,
            verified,
        },
        editor: getUserReference(editorUserId),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    await docRef.create(docData);

    // Get the created document
    const created = await docRef.get();
    const createdData = created.data() as RichPodDocument;
    const editor = await getUserById(editorUserId);
    if (!editor) {
        throw new Error(`Editor not found for user ${editorUserId}`);
    }

    return mapToGraphQL(richPodId, createdData, [], editor);
}

/**
 * Update a RichPod.
 */
export async function updateRichPod(
    id: string,
    updates: Partial<Omit<RichPodDocument, "createdAt" | "updatedAt" | "editor">>,
    editorUserId: string,
): Promise<RichPod | null> {
    const docRef = db.collection(RICHPODS_COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
        return null;
    }

    const data = doc.data() as RichPodDocument;

    if (data.editor.id !== editorUserId) {
        throw new Error("Unauthorized: You can only edit your own RichPods");
    }

    // Prevent publishing without chapters
    if (updates.state === FirestoreRichPodState.PUBLISHED) {
        const latestChapter = await getLatestChapter(id);
        if (!latestChapter || latestChapter.chapters.length === 0) {
            throw new Error("Cannot publish a RichPod without chapters");
        }
    }

    // Build the Firestore update payload
    const updatePayload: Record<string, unknown> = {
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
    };

    // When publishing, set publishedAt if not already set
    if (updates.state === FirestoreRichPodState.PUBLISHED && !data.publishedAt) {
        updatePayload.publishedAt = FieldValue.serverTimestamp();
    }
    // When unpublishing, clear publishedAt
    if (updates.state === FirestoreRichPodState.DRAFT && data.publishedAt) {
        updatePayload.publishedAt = null;
    }

    await docRef.update(updatePayload);

    // Sync hosted episode publish state if this is a hosted RichPod
    if (data.isHosted && updates.state) {
        await syncHostedEpisodePublishState(id, updates.state);
    }

    const updated = await docRef.get();
    const updatedData = updated.data() as RichPodDocument;
    const editor = await getUserById(updatedData.editor.id);
    if (!editor) {
        throw new Error(`Editor not found for RichPod ${id}`);
    }

    return mapToGraphQL(
        id,
        updatedData,
        await getChaptersForRichPod(id, updatedData.origin),
        editor,
    );
}

/**
 * Add a new chapter version to a RichPod.
 */
export async function setChaptersForRichPod(
    richPodId: string,
    chapters: Chapter[],
    editorUserId: string,
    userRole?: UserRoleValue | null,
): Promise<string> {
    // Verify ownership before allowing chapter updates
    const richPodRef = db.collection(RICHPODS_COLLECTION).doc(richPodId);
    const richPodDoc = await richPodRef.get();

    if (!richPodDoc.exists) {
        throw new Error("RichPod not found");
    }

    const richPodData = richPodDoc.data() as RichPodDocument;
    if (richPodData.editor.id !== editorUserId) {
        throw new Error("Unauthorized: You can only edit chapters of your own RichPods");
    }

    // Prevent removing all chapters from a published RichPod
    if (richPodData.state === FirestoreRichPodState.PUBLISHED && chapters.length === 0) {
        throw new Error("Cannot remove all chapters from a published RichPod");
    }

    // Security check: Slideshow and Poll require verification (bypassed for privileged roles)
    const requiresVerification =
        !isPrivilegedRole(userRole) &&
        chapters.some(
            (ch) =>
                ch.enclosureType === EnclosureType.SLIDESHOW ||
                ch.enclosureType === EnclosureType.POLL,
        );

    if (requiresVerification) {
        if (!richPodData.origin.verified) {
            throw new Error("Slideshow and Poll chapters require podcast verification");
        }
    }

    const chaptersCollection = richPodRef.collection(CHAPTERS_SUBCOLLECTION);

    return await db.runTransaction(async (tx) => {
        const latestQuery = chaptersCollection.orderBy("version", "desc").limit(1);
        const latestSnap = await tx.get(latestQuery);
        const nextVersion = latestSnap.empty
            ? 1
            : (latestSnap.docs[0].data().version as number) + 1;

        const docRef = chaptersCollection.doc();
        tx.set(docRef, {
            version: nextVersion,
            chapters: chapters,
            createdAt: FieldValue.serverTimestamp(),
        } as Omit<ChapterDocument, "createdAt"> & { createdAt: FirebaseFirestore.FieldValue });

        const richPodRef = db.collection(RICHPODS_COLLECTION).doc(richPodId);
        tx.update(richPodRef, { updatedAt: FieldValue.serverTimestamp() });

        return docRef.id;
    });
}

/**
 * Get the latest chapter for a RichPod.
 */
async function getLatestChapter(richPodId: string): Promise<ChapterDocument | null> {
    const chaptersCollection = db
        .collection(RICHPODS_COLLECTION)
        .doc(richPodId)
        .collection(CHAPTERS_SUBCOLLECTION);

    const latestChapter = await chaptersCollection.orderBy("version", "desc").limit(1).get();

    if (latestChapter.empty) {
        return null;
    }

    return latestChapter.docs[0].data() as ChapterDocument;
}

/**
 * Get all chapters for a RichPod (latest version).
 */
async function getChaptersForRichPod(richPodId: string, origin?: PodcastOrigin): Promise<GraphQLChapter[]> {
    const latestChapter = await getLatestChapter(richPodId);

    if (!latestChapter) {
        return [];
    }

    // Fetch enclosures from GCS and map to GraphQL chapters
    return await Promise.all(
        latestChapter.chapters.map(async (enclosure) => {
            const enclosureData = await getEnclosure(enclosure.gcsName);

            // This is a fatal error and should fail subsequent operations.
            if (!enclosureData) {
                throw new Error(`Enclosure data not found: ${enclosure.gcsName}`);
            }

            const mappedEnclosure = mapEnclosureToGraphQL(enclosure.enclosureType, enclosureData, origin);

            return {
                begin: enclosure.begin,
                enclosure: mappedEnclosure,
            };
        }),
    );
}

/**
 * Soft delete a RichPod
 */
export async function deleteRichPod(id: string, editorUserId: string): Promise<boolean> {
    const docRef = db.collection(RICHPODS_COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
        return false;
    }

    const data = doc.data() as RichPodDocument;

    if (data.editor.id !== editorUserId) {
        throw new Error("Unauthorized: You can only delete your own RichPods");
    }

    await docRef.update({
        state: FirestoreRichPodState.DELETED,
        updatedAt: FieldValue.serverTimestamp(),
    });

    return true;
}

/**
 * Convert Firestore RichPodState to GraphQL RichPodState enum
 */
function mapFirestoreStateToGraphQL(firestoreState?: RichPodStateType): RichPodState {
    switch (firestoreState) {
        case FirestoreRichPodState.PUBLISHED:
            return RichPodState.Published;
        case FirestoreRichPodState.DRAFT:
        default:
            return RichPodState.Draft;
    }
}

/**
 * Map Firestore document to GraphQL type
 */
function mapToGraphQL(
    id: string,
    data: RichPodDocument,
    chapters: GraphQLChapter[],
    editor: User,
): RichPod {
    const verified = data.origin.verified ?? false;
    return {
        id,
        title: data.title,
        description: data.description,
        state: mapFirestoreStateToGraphQL(data.state), // Convert Firestore state to GraphQL enum
        origin: {
            id: data.origin.id,
            title: data.origin.title,
            link: data.origin.link,
            feedUrl: data.origin.feedUrl,
            artworkUrl: data.origin.artworkUrl,
            verified,
            episode: {
                guid: data.origin.episode.guid,
                title: data.origin.episode.title,
                artworkUrl: data.origin.episode.artworkUrl,
                link: data.origin.episode.link,
                media: {
                    url: data.origin.episode.media.url,
                    type: data.origin.episode.media.type,
                    length: data.origin.episode.media.length,
                    checksum: data.origin.episode.media.checksum,
                },
            },
        },
        chapters,
        editor,
        createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
        isHosted: data.isHosted ?? false,
        hostedEpisodeId: data.hostedEpisodeId ?? null,
        publishedAt: data.publishedAt?.toDate().toISOString() ?? null,
        explicit: data.explicit ?? false,
    };
}

/**
 * Map Firestore enclosure to GraphQL enclosure union type based on enclosureType
 */
function mapEnclosureToGraphQL(
    enclosureType: EnclosureTypeValue,
    enclosure: Enclosure,
    origin?: PodcastOrigin,
): GraphQLEnclosure {
    switch (enclosureType) {
        case EnclosureType.MARKDOWN:
            return {
                __typename: "Markdown",
                title: enclosure.title,
                text: enclosure.text || "",
            };

        case EnclosureType.INTERACTIVE_CHART:
            // Chart format is explicitly specified in chartFormat field
            return {
                __typename: "InteractiveChart",
                title: enclosure.title,
                description: enclosure.description || null,
                chartFormat: enclosure.chartFormat === "ECHARTS" ? ChartFormat.Echarts : ChartFormat.PlainData,
                chart: enclosure.chart || {},
            };

        case EnclosureType.GEO_MAP:
            return {
                __typename: "GeoMap",
                title: enclosure.title,
                description: enclosure.description || null,
                geoJSON: enclosure.geoJSON || {},
            };

        case EnclosureType.SLIDESHOW:
            return {
                __typename: "Slideshow",
                title: enclosure.title,
                description: enclosure.description || null,
                slides: (enclosure.slides || []).map((slide) => ({
                    imageUrl: slide.imageUrl.startsWith("http")
                        ? slide.imageUrl
                        : `${process.env.API_BASE_URL}${slide.imageUrl}`,
                    imageAlt: slide.imageAlt,
                    caption: slide.caption,
                    credit: slide.credit,
                })),
            };

        case EnclosureType.POLL:
            return {
                __typename: "Poll",
                coloeus: {
                    endpoint: enclosure.coloeus?.endpoint || "",
                    pollId: enclosure.coloeus?.pollId || "",
                },
            };

        case EnclosureType.FACTBOX:
            return {
                __typename: "Factbox",
                title: enclosure.title,
                text: enclosure.text || "",
                links: (enclosure.links || []).map((link) => ({
                    label: link.label,
                    url: link.url,
                })),
            };

        case EnclosureType.CARD: {
            const cardTypeMap: Record<string, GraphQLCardType> = {
                LINK: GraphQLCardType.Link,
                COVER: GraphQLCardType.Cover,
                CITATION: GraphQLCardType.Citation,
                IMAGE: GraphQLCardType.Image,
                BLANK: GraphQLCardType.Blank,
            };
            return {
                __typename: "Card",
                title: enclosure.title,
                cardType: cardTypeMap[enclosure.cardType || "BLANK"] || GraphQLCardType.Blank,
                visibleAsChapter: enclosure.visibleAsChapter ?? false,
                url: enclosure.url || null,
                openGraph: enclosure.openGraph
                    ? {
                          ogTitle: enclosure.openGraph.ogTitle || null,
                          ogDescription: enclosure.openGraph.ogDescription || null,
                          ogImageUrl: enclosure.openGraph.ogImageUrl
                              ? (enclosure.openGraph.ogImageUrl.startsWith("http")
                                    ? enclosure.openGraph.ogImageUrl
                                    : `${process.env.API_BASE_URL}${enclosure.openGraph.ogImageUrl}`)
                              : null,
                          ogImageWidth: enclosure.openGraph.ogImageWidth ?? null,
                          ogImageHeight: enclosure.openGraph.ogImageHeight ?? null,
                      }
                    : null,
                description: enclosure.description || null,
                coverSource: enclosure.coverSource || null,
                coverImageUrl: enclosure.coverSource === "episode"
                    ? (origin?.episode?.artworkUrl || origin?.artworkUrl || null)
                    : (origin?.artworkUrl || null),
                quoteText: enclosure.quoteText || null,
                citationSource: enclosure.citationSource || null,
                citationUrl: enclosure.citationUrl || null,
                imageUrl: enclosure.imageUrl
                    ? (enclosure.imageUrl.startsWith("http")
                          ? enclosure.imageUrl
                          : `${process.env.API_BASE_URL}${enclosure.imageUrl}`)
                    : null,
                imageAlt: enclosure.imageAlt || null,
                imageLink: enclosure.imageLink || null,
            };
        }

        default:
            throw new Error(`Unknown enclosure type: ${enclosureType}`);
    }
}
