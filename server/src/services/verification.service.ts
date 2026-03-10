import Joi from "joi";
import { ServerClient } from "postmark";
import { FieldValue, DocumentReference } from "@google-cloud/firestore";
import { db, VERIFICATIONS_COLLECTION } from "../config/firestore.js";
import { fetchFeedForVerification } from "./feed.service.js";
import {
    VerificationDocument,
    VerificationRequestState,
    VerificationRequestStateValue,
} from "../types/firestore.js";
import { getUserReference } from "./user.service.js";
import type { PaginatedResult } from "../utils/pagination.js";
import { ValidationError } from "../validation/validator.js";

const VERIFICATION_TIMEOUT_MS = 10 * 60 * 1000;

const POSTMARK_SERVER_TOKEN = process.env.POSTMARK_SERVER_TOKEN;
const POSTMARK_FROM_EMAIL = process.env.POSTMARK_FROM_EMAIL;
if (!POSTMARK_SERVER_TOKEN || !POSTMARK_FROM_EMAIL) {
    throw new Error("Postmark configuration is missing. Please set POSTMARK_SERVER_TOKEN and POSTMARK_FROM_EMAIL environment variables.");
}

const postmarkClient: ServerClient = new ServerClient(POSTMARK_SERVER_TOKEN);

type VerificationRecord = {
    id: string;
    feedUrl: string;
    email: string;
    state: VerificationRequestStateValue;
    createdAt: string;
    verificationTimestamp: string | null;
    expiresAt: string;
};

function getPostmarkConfig() {
    return {
        client: postmarkClient,
        subject:
            process.env.POSTMARK_VERIFICATION_SUBJECT?.trim() ||
            "RichPods verification code",
        templateHtml:
            process.env.POSTMARK_VERIFICATION_TEMPLATE_HTML?.trim() ||
            "<p>Your RichPods verification code is <strong>{{code}}</strong></p><p>This code expires in 10 minutes.</p>",
    };
}

function interpolateTemplate(template: string, params: Record<string, string>): string {
    return Object.entries(params).reduce((result, [key, value]) => {
        const pattern = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
        return result.replace(pattern, value);
    }, template);
}

function extractEmailFromFeed(parsedFeed: any): string | null {
    if (!parsedFeed?.rss?.channel) {
        return null;
    }

    const channel = parsedFeed.rss.channel;
    const directEmail = typeof channel["itunes:email"] === "string" ? channel["itunes:email"].trim() : undefined;
    if (directEmail && isValidEmail(directEmail)) {
        return directEmail;
    }

    const owner = channel["itunes:owner"];
    const ownerEmail = typeof owner?.["itunes:email"] === "string" ? owner["itunes:email"].trim() : undefined;
    if (ownerEmail && isValidEmail(ownerEmail)) {
        return ownerEmail;
    }

    return null;
}

const emailSchema = Joi.string()
    .trim()
    .email();

function isValidEmail(email: string): boolean {
    const { error } = emailSchema.validate(email);
    return !error;
}

function generateVerificationCode(): string {
    const min = 10000000; // 8 digits
    const max = 99999999;
    const code = Math.floor(Math.random() * (max - min + 1)) + min;
    return String(code);
}

async function sendVerificationEmail(to: string, code: string, feedUrl: string) {
    const { client, subject, templateHtml } = getPostmarkConfig();
    const htmlBody = interpolateTemplate(templateHtml, { code, feedUrl });
    const textBody = `Your RichPods verification code is ${code}. It expires in 10 minutes.`;

    try {
        await client.sendEmail({
            From: POSTMARK_FROM_EMAIL as string,
            To: to,
            Subject: interpolateTemplate(subject, { code, feedUrl }),
            HtmlBody: htmlBody,
            TextBody: textBody,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to send verification email: ${message}`);
    }
}

function mapVerification(docId: string, data: VerificationDocument): VerificationRecord {
    const createdAt = data.createdAt.toDate();
    const verificationTimestamp = data.verificationTimestamp ? data.verificationTimestamp.toDate() : null;
    const expiresAt = new Date(createdAt.getTime() + VERIFICATION_TIMEOUT_MS);
    return {
        id: docId,
        feedUrl: data.feedUrl,
        email: data.email,
        state: data.state,
        createdAt: createdAt.toISOString(),
        verificationTimestamp: verificationTimestamp ? verificationTimestamp.toISOString() : null,
        expiresAt: expiresAt.toISOString(),
    };
}

async function markExpiredPendingAsFailed(userRef: DocumentReference, now = new Date()): Promise<void> {
    const snapshot = await db
        .collection(VERIFICATIONS_COLLECTION)
        .where("user", "==", userRef)
        .where("state", "==", VerificationRequestState.PENDING)
        .get();

    const updates = snapshot.docs.map(async (doc) => {
        const data = doc.data() as VerificationDocument;
        const createdAt = data.createdAt?.toDate();
        if (!createdAt) {
            return;
        }
        const isExpired = now.getTime() - createdAt.getTime() >= VERIFICATION_TIMEOUT_MS;
        if (isExpired) {
            await doc.ref.update({
                state: VerificationRequestState.FAILED,
                verificationTimestamp: FieldValue.serverTimestamp(),
            });
        }
    });

    await Promise.all(updates);
}

async function ensureNoRecentPending(userRef: DocumentReference): Promise<void> {
    await markExpiredPendingAsFailed(userRef);

    const snapshot = await db
        .collection(VERIFICATIONS_COLLECTION)
        .where("user", "==", userRef)
        .where("state", "==", VerificationRequestState.PENDING)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

    if (snapshot.empty) {
        return;
    }

    const doc = snapshot.docs[0];
    const data = doc.data() as VerificationDocument;
    const createdAt = data.createdAt?.toDate();
    if (!createdAt) {
        return;
    }

    const now = new Date();
    const diff = now.getTime() - createdAt.getTime();
    if (diff < VERIFICATION_TIMEOUT_MS) {
        throw new Error("A verification is already pending. Please wait up to 10 minutes before starting a new verification.");
    }

    await doc.ref.update({
        state: VerificationRequestState.FAILED,
        verificationTimestamp: FieldValue.serverTimestamp(),
    });
}

export async function startVerification(userId: string, feedUrl: string): Promise<VerificationRecord> {
    const userRef = getUserReference(userId);
    await ensureNoRecentPending(userRef);

    const { parsedFeed } = await fetchFeedForVerification(feedUrl);
    const email = extractEmailFromFeed(parsedFeed);

    if (!email) {
        throw new Error("No valid itunes:email could be found in the RSS feed.");
    }

    const code = generateVerificationCode();
    await sendVerificationEmail(email, code, feedUrl);

    const docRef = await db.collection(VERIFICATIONS_COLLECTION).add({
        user: userRef,
        feedUrl,
        token: code,
        email,
        state: VerificationRequestState.PENDING,
        createdAt: FieldValue.serverTimestamp(),
    });

    const created = await docRef.get();
    const data = created.data() as VerificationDocument;
    return mapVerification(docRef.id, data);
}

export async function completeVerification(
    userId: string,
    feedUrl: string,
    token: string,
): Promise<VerificationRecord> {
    const userRef = getUserReference(userId);
    await markExpiredPendingAsFailed(userRef);

    const snapshot = await db
        .collection(VERIFICATIONS_COLLECTION)
        .where("user", "==", userRef)
        .where("feedUrl", "==", feedUrl)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

    if (snapshot.empty) {
        throw new Error("No verification request found for this feed. Please start a new verification.");
    }

    const doc = snapshot.docs[0];
    const data = doc.data() as VerificationDocument;

    if (data.state !== VerificationRequestState.PENDING) {
        throw new Error("This verification request is no longer pending. Please start a new verification.");
    }

    const createdAt = data.createdAt?.toDate();
    if (!createdAt) {
        throw new Error("Verification request timestamp is missing.");
    }

    const now = new Date();
    const isExpired = now.getTime() - createdAt.getTime() >= VERIFICATION_TIMEOUT_MS;
    if (isExpired) {
        await doc.ref.update({
            state: VerificationRequestState.FAILED,
            verificationTimestamp: FieldValue.serverTimestamp(),
        });
        throw new Error("Verification code expired. Please start a new verification.");
    }

    if (data.token !== token) {
        await doc.ref.update({
            state: VerificationRequestState.FAILED,
            verificationTimestamp: FieldValue.serverTimestamp(),
        });
        throw new Error("Invalid verification code. Please start a new verification.");
    }

    await doc.ref.update({
        state: VerificationRequestState.VERIFIED,
        verificationTimestamp: FieldValue.serverTimestamp(),
    });

    const updated = await doc.ref.get();
    const updatedData = updated.data() as VerificationDocument;
    return mapVerification(doc.id, updatedData);
}

export async function getUserVerifications(
    userId: string,
    pageSize: number,
    afterCursor?: string | null,
): Promise<PaginatedResult<VerificationRecord>> {
    const userRef = getUserReference(userId);
    await markExpiredPendingAsFailed(userRef);

    const baseQuery = db
        .collection(VERIFICATIONS_COLLECTION)
        .where("user", "==", userRef);

    let orderedQuery = baseQuery.orderBy("createdAt", "desc").limit(pageSize + 1);

    if (afterCursor) {
        const cursorDoc = await db.collection(VERIFICATIONS_COLLECTION).doc(afterCursor).get();
        if (!cursorDoc.exists) {
            throw new ValidationError("Validation failed for after", ["after: invalid or stale cursor"]);
        }
        orderedQuery = orderedQuery.startAfter(cursorDoc);
    }

    const snapshot = await orderedQuery.get();
    const hasNextPage = snapshot.docs.length > pageSize;
    const docs = hasNextPage ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

    const items = docs.map((doc) => mapVerification(doc.id, doc.data() as VerificationDocument));
    const nextCursor = hasNextPage && docs.length > 0 ? docs[docs.length - 1].id : null;

    return { items, nextCursor };
}

export type RichPodVerificationStatusValue =
    | "verified"
    | "pending"
    | "failed"
    | "unverified";

export async function resolveRichPodVerificationStatus(
    editorUserId: string,
    feedUrl: string,
    requestingUserId?: string,
): Promise<RichPodVerificationStatusValue> {
    const userRef = getUserReference(editorUserId);
    await markExpiredPendingAsFailed(userRef);

    const snapshot = await db
        .collection(VERIFICATIONS_COLLECTION)
        .where("user", "==", userRef)
        .where("feedUrl", "==", feedUrl)
        .orderBy("verificationTimestamp", "desc")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

    if (snapshot.empty) {
        return "unverified";
    }

    const doc = snapshot.docs[0];
    const data = doc.data() as VerificationDocument;

    if (data.state === VerificationRequestState.VERIFIED) {
        return "verified";
    } else if (requestingUserId && requestingUserId === editorUserId) {
        if (data.state === VerificationRequestState.PENDING) {
            return "pending";
        } else if (data.state === VerificationRequestState.FAILED) {
            return "failed";
        }
    }

    return "unverified";
}

