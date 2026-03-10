import {
    getRichPodById,
    getUserRichPods,
    getRecentPublishedRichPods,
    createRichPod,
    updateRichPod,
    deleteRichPod,
    setChaptersForRichPod,
} from "./services/richpod.service.js";
import { uploadEnclosure } from "./services/storage.service.js";
import { RichPodState, type Enclosure } from "./types/firestore.js";
import {
    signUpWithEmailPassword,
    signInWithEmailPassword,
    signInWithGoogle,
    updateUserProfile,
} from "./services/auth.service.js";
import { getUserById } from "./services/user.service.js";
import {
    searchPodcastEpisodes,
    extractFeedUrl,
    getPodcastMetadata,
} from "./services/podcast.service.js";
import {
    startVerification,
    completeVerification,
    getUserVerifications,
} from "./services/verification.service.js";
import {
    getHostedPodcastById,
    getUserHostedPodcasts,
    updateHostedPodcast,
    deleteHostedPodcast,
} from "./services/hosted-podcast.service.js";
import {
    getHostedEpisode,
    getHostedEpisodesForPodcast,
    deleteHostedEpisode,
} from "./services/hosted-episode.service.js";
import { validate, validateField } from "./validation/validator.js";
import {
    signUpInputSchema,
    signInInputSchema,
    googleIdTokenSchema,
    updateProfileInputSchema,
    createRichPodInputSchema,
    updateRichPodInputSchema,
    idSchema,
    urlSchema,
    podcastSearchSchema,
    podcastMetadataSchema,
    setChaptersInputSchema,
    startVerificationSchema,
    completeVerificationSchema,
    paginationFirstSchema,
    paginationAfterSchema,
    richPodStateFilterSchema,
} from "./validation/schemas.js";
import { updateHostedPodcastInputSchema } from "./validation/hosted-schemas.js";
import { type AuthContext, requireAuth, requirePrivilegedAuth } from "./middleware/auth.js";
import { resolvePageSize } from "./utils/pagination.js";
import type { EnclosureTypeValue, Chapter as ChapterFS } from "./types/firestore.js";
import {
    RichPod,
    User,
    AuthPayload,
    SignUpInput,
    SignInInput,
    UpdateProfileInput,
    CreateRichPodInput,
    UpdateRichPodInput,
    PodcastMetadata,
    PodcastEpisodeSearchResult,
    HostedPodcast,
    HostedEpisode,
    UpdateHostedPodcastInput,
    PaginatedRichPods,
    PaginatedHostedPodcasts,
    PaginatedHostedEpisodes,
} from "./graphql.js";
import { Request } from "express";
import { parseAcceptLanguageHeader, type SupportedLanguage } from "@richpods/shared/i18n/language";

function resolveEditorLanguageFromRequest(req: Request): SupportedLanguage {
    return parseAcceptLanguageHeader(req.headers["accept-language"]) ?? "en";
}

export function createResolvers(req: Request, auth: AuthContext) {
    return {
        //
        // Queries
        //
        richPod: async ({ id }: { id: string }): Promise<RichPod | null> => {
            const validatedId = validateField<string>(idSchema, id, "id");
            return getRichPodById(
                validatedId,
                [RichPodState.PUBLISHED, RichPodState.DRAFT],
                auth.userId ?? undefined,
            );
        },

        userRichPods: async ({
            first,
            after,
            state,
        }: {
            first?: number;
            after?: string;
            state?: string;
        }): Promise<PaginatedRichPods> => {
            const userId = requireAuth(auth);
            const pageSize = resolvePageSize(
                first !== undefined ? validateField<number>(paginationFirstSchema, first, "first") : undefined,
            );
            const validatedAfter = after !== undefined ? validateField<string>(paginationAfterSchema, after, "after") : undefined;
            const validatedState = state !== undefined ? validateField<string>(richPodStateFilterSchema, state, "state") : undefined;
            return getUserRichPods(userId, pageSize, validatedAfter, validatedState);
        },

        recentPublishedRichPods: async ({
            first,
            after,
        }: {
            first?: number;
            after?: string;
        }): Promise<PaginatedRichPods> => {
            const pageSize = resolvePageSize(
                first !== undefined ? validateField<number>(paginationFirstSchema, first, "first") : undefined,
            );
            const validatedAfter = after !== undefined ? validateField<string>(paginationAfterSchema, after, "after") : undefined;
            return getRecentPublishedRichPods(Math.min(pageSize, 24), validatedAfter);
        },

        currentUser: async (): Promise<User | null> => {
            if (!auth.user) return null;
            return { ...auth.user, role: auth.role ?? null };
        },

        user: async ({ id }: { id: string }): Promise<User | null> => {
            const validatedId = validateField<string>(idSchema, id, "id");
            return getUserById(validatedId, false);
        },

        podcastMetadata: async ({
            feedUrl,
            episodeGuid,
        }: {
            feedUrl: string;
            episodeGuid?: string;
        }): Promise<PodcastMetadata> => {
            const validatedInput = validate<{ feedUrl: string; episodeGuid?: string }>(
                podcastMetadataSchema,
                { feedUrl, episodeGuid },
            );
            return getPodcastMetadata(validatedInput.feedUrl, validatedInput.episodeGuid, {
                userId: auth.userId ?? undefined,
                email: auth.email ?? undefined,
            });
        },

        extractFeedUrl: async ({ url }: { url: string }): Promise<string> => {
            const validatedUrl = validateField<string>(urlSchema, url, "url");
            return extractFeedUrl(validatedUrl);
        },

        podcastEpisodeSearch: async ({
            query,
            country,
            language,
        }: {
            query: string;
            country?: string;
            language?: string;
        }): Promise<PodcastEpisodeSearchResult[]> => {
            const validatedInput = validate<{
                query: string;
                country?: string;
                language?: string;
            }>(podcastSearchSchema, { query, country, language });
            return searchPodcastEpisodes(
                validatedInput.query,
                validatedInput.country,
                validatedInput.language,
            );
        },

        userVerifications: async ({
            first,
            after,
        }: {
            first?: number;
            after?: string;
        }) => {
            const userId = requireAuth(auth);
            const pageSize = resolvePageSize(
                first !== undefined ? validateField<number>(paginationFirstSchema, first, "first") : undefined,
            );
            const validatedAfter = after !== undefined ? validateField<string>(paginationAfterSchema, after, "after") : undefined;
            return getUserVerifications(userId, pageSize, validatedAfter);
        },

        //
        // Mutations
        //
        signUp: async ({ input }: { input: SignUpInput }): Promise<AuthPayload> => {
            const validatedInput = validate<SignUpInput>(signUpInputSchema, input);
            const editorLanguage = resolveEditorLanguageFromRequest(req);
            const { user, token } = await signUpWithEmailPassword(
                validatedInput.email,
                validatedInput.password,
                editorLanguage,
            );
            return { user, token };
        },

        signIn: async ({ input }: { input: SignInInput }): Promise<AuthPayload> => {
            const validatedInput = validate<SignInInput>(signInInputSchema, input);
            const editorLanguage = resolveEditorLanguageFromRequest(req);
            const { user, token } = await signInWithEmailPassword(
                validatedInput.email,
                validatedInput.password,
                editorLanguage,
            );

            return { user, token };
        },

        signInWithGoogle: async ({ idToken }: { idToken: string }): Promise<AuthPayload> => {
            const validated = validate<{ idToken: string }>(googleIdTokenSchema, { idToken });
            const editorLanguage = resolveEditorLanguageFromRequest(req);
            const { user, token } = await signInWithGoogle(validated.idToken, editorLanguage);
            return { user, token };
        },

        updateProfile: async ({ input }: { input: UpdateProfileInput }): Promise<User> => {
            const userId = requireAuth(auth);
            const validatedInput = validate<UpdateProfileInput>(updateProfileInputSchema, input);

            // Cast editorLanguage - Joi validation already ensures it's a valid SupportedLanguage
            const editorLanguage = validatedInput.editorLanguage as SupportedLanguage | undefined;

            const updatedUser = await updateUserProfile(userId, {
                publicName: validatedInput.publicName || undefined,
                biography: validatedInput.biography || undefined,
                website: validatedInput.website || undefined,
                publicEmail: validatedInput.publicEmail || undefined,
                socialAccounts: validatedInput.socialAccounts || undefined,
                editorLanguage: editorLanguage || undefined,
            });

            if (!updatedUser) {
                throw new Error("Failed to update profile");
            }

            return updatedUser;
        },

        createRichPod: async ({ input }: { input: CreateRichPodInput }): Promise<RichPod> => {
            const userId = requireAuth(auth);
            const validatedInput = validate<CreateRichPodInput>(createRichPodInputSchema, input);
            return createRichPod(
                {
                    title: validatedInput.title,
                    description: validatedInput.description,
                    state: RichPodState.DRAFT,
                    origin: {
                        id: Date.now().toString(),
                        title: validatedInput.origin.title,
                        link: validatedInput.origin.link || undefined,
                        feedUrl: validatedInput.origin.feedUrl,
                        artworkUrl: validatedInput.origin.artworkUrl || undefined,
                        episode: {
                            guid: validatedInput.origin.episode.guid,
                            title: validatedInput.origin.episode.title,
                            artworkUrl: validatedInput.origin.episode.artworkUrl || undefined,
                            link: validatedInput.origin.episode.link || undefined,
                            media: {
                                url: validatedInput.origin.episode.media.url,
                                type: validatedInput.origin.episode.media.type,
                                length: validatedInput.origin.episode.media.length,
                                checksum: validatedInput.origin.episode.media.checksum,
                            },
                        },
                    },
                },
                userId,
            );
        },

        updateRichPod: async ({
            id,
            input,
        }: {
            id: string;
            input: UpdateRichPodInput;
        }): Promise<RichPod | null> => {
            const userId = requireAuth(auth);
            const validatedId = validateField<string>(idSchema, id, "id");
            const validatedInput = validate<UpdateRichPodInput>(updateRichPodInputSchema, input);

            const updates: Record<string, unknown> = {};
            if (validatedInput.title !== undefined) updates.title = validatedInput.title;
            if (validatedInput.description !== undefined)
                updates.description = validatedInput.description;
            if (validatedInput.state !== undefined) updates.state = validatedInput.state;
            if (validatedInput.explicit !== undefined)
                updates.explicit = validatedInput.explicit;

            return updateRichPod(validatedId, updates, userId);
        },

        deleteRichPod: async ({ id }: { id: string }): Promise<boolean> => {
            const userId = requireAuth(auth);
            const validatedId = validateField<string>(idSchema, id, "id");
            return deleteRichPod(validatedId, userId);
        },

        setRichPodChapters: async ({
            id,
            chapters,
        }: {
            id: string;
            chapters: Array<{ begin: string; enclosureType: string; enclosure: any }>;
        }): Promise<RichPod | null> => {
            const userId = requireAuth(auth);
            const validatedId = validateField<string>(idSchema, id, "id");
            const validatedInput = validate<{
                chapters: Array<{ begin: string; enclosureType: string; enclosure: unknown }>;
            }>(setChaptersInputSchema, { chapters });

            const fsChapters: ChapterFS[] = [];
            for (const ch of validatedInput.chapters) {
                const type = ch.enclosureType as EnclosureTypeValue;
                // Validation has verified this is a valid Enclosure
                const gcsName = await uploadEnclosure(validatedId, type, ch.enclosure as Enclosure);
                fsChapters.push({ begin: ch.begin, enclosureType: type, gcsName });
            }

            await setChaptersForRichPod(validatedId, fsChapters, userId, auth.role);
            return getRichPodById(
                validatedId,
                [RichPodState.PUBLISHED, RichPodState.DRAFT],
                userId,
            );
        },

        startRichPodVerification: async ({ feedUrl }: { feedUrl: string }) => {
            const userId = requireAuth(auth);
            const validatedInput = validate<{ feedUrl: string }>(startVerificationSchema, {
                feedUrl,
            });
            return startVerification(userId, validatedInput.feedUrl);
        },

        completeRichPodVerification: async ({
            feedUrl,
            code,
        }: {
            feedUrl: string;
            code: string;
        }) => {
            const userId = requireAuth(auth);
            const validatedInput = validate<{ feedUrl: string; code: string }>(
                completeVerificationSchema,
                { feedUrl, code },
            );

            return completeVerification(userId, validatedInput.feedUrl, validatedInput.code);
        },

        // Hosted Podcasts queries
        hostedPodcasts: async ({
            first,
            after,
        }: {
            first?: number;
            after?: string;
        }): Promise<PaginatedHostedPodcasts> => {
            const userId = requirePrivilegedAuth(auth);
            const pageSize = resolvePageSize(
                first !== undefined ? validateField<number>(paginationFirstSchema, first, "first") : undefined,
            );
            const validatedAfter = after !== undefined ? validateField<string>(paginationAfterSchema, after, "after") : undefined;
            return getUserHostedPodcasts(userId, pageSize, validatedAfter);
        },

        hostedPodcast: async ({ id }: { id: string }): Promise<HostedPodcast | null> => {
            const userId = requirePrivilegedAuth(auth);
            const validatedId = validateField<string>(idSchema, id, "id");
            return getHostedPodcastById(validatedId, userId);
        },

        hostedEpisodes: async ({
            podcastId,
            first,
            after,
        }: {
            podcastId: string;
            first?: number;
            after?: string;
        }): Promise<PaginatedHostedEpisodes> => {
            const userId = requirePrivilegedAuth(auth);
            const validatedId = validateField<string>(idSchema, podcastId, "podcastId");
            const pageSize = resolvePageSize(
                first !== undefined ? validateField<number>(paginationFirstSchema, first, "first") : undefined,
            );
            const validatedAfter = after !== undefined ? validateField<string>(paginationAfterSchema, after, "after") : undefined;
            return getHostedEpisodesForPodcast(validatedId, userId, pageSize, validatedAfter);
        },

        hostedEpisode: async ({ id }: { id: string }): Promise<HostedEpisode | null> => {
            const userId = requirePrivilegedAuth(auth);
            const validatedId = validateField<string>(idSchema, id, "id");
            return getHostedEpisode(validatedId, userId);
        },

        // Hosted Podcasts mutations
        updateHostedPodcast: async ({
            id,
            input,
        }: {
            id: string;
            input: UpdateHostedPodcastInput;
        }): Promise<HostedPodcast | null> => {
            const userId = requirePrivilegedAuth(auth);
            const validatedId = validateField<string>(idSchema, id, "id");
            const validatedInput = validate<UpdateHostedPodcastInput>(
                updateHostedPodcastInputSchema,
                input,
            );

            return updateHostedPodcast(validatedId, validatedInput, userId);
        },

        deleteHostedPodcast: async ({ id }: { id: string }): Promise<boolean> => {
            const userId = requirePrivilegedAuth(auth);
            const validatedId = validateField<string>(idSchema, id, "id");
            return deleteHostedPodcast(validatedId, userId);
        },

        deleteHostedEpisode: async ({ id }: { id: string }): Promise<boolean> => {
            const userId = requirePrivilegedAuth(auth);
            const validatedId = validateField<string>(idSchema, id, "id");
            return deleteHostedEpisode(validatedId, userId);
        },
    };
}
