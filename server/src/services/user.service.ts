import { db, USERS_COLLECTION } from "../config/firestore.js";
import { FieldValue } from "@google-cloud/firestore";
import { UserDocument, UserState } from "../types/firestore.js";
import { User } from "../graphql.js";
import { getUserQuotaInfo } from "./quota.service.js";
import { type SupportedLanguage } from "@richpods/shared/i18n/language";

export async function getUserById(id: string, isCurrentUser = false): Promise<User | null> {
    const doc = await db.collection(USERS_COLLECTION).doc(id).get();

    if (!doc.exists) {
        return null;
    }

    const data = doc.data() as UserDocument;

    if (data.state === UserState.BLOCKED) {
        return null;
    }

    return await mapToGraphQL(id, data, isCurrentUser);
}

export async function getUserByFirebaseUid(
    firebaseUid: string,
    isCurrentUser = false,
): Promise<User | null> {
    const querySnapshot = await db
        .collection(USERS_COLLECTION)
        .where("firebaseUid", "==", firebaseUid)
        .where("state", "==", UserState.ACTIVE)
        .limit(1)
        .get();

    if (querySnapshot.empty) {
        return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data() as UserDocument;

    return await mapToGraphQL(doc.id, data, isCurrentUser);
}


export async function createUser(firebaseUid: string, editorLanguage: SupportedLanguage): Promise<User> {
    const docData = {
        firebaseUid,
        socialAccounts: [],
        editorLanguage,
        state: UserState.ACTIVE,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection(USERS_COLLECTION).add(docData);
    const created = await docRef.get();
    const createdData = created.data() as UserDocument;
    console.info(`Created new user with uid: ${createdData.firebaseUid}`)

    return await mapToGraphQL(docRef.id, createdData, true);
}

export async function updateUser(
    id: string,
    updates: Partial<Omit<UserDocument, "createdAt" | "updatedAt" | "firebaseUid">>,
): Promise<User | null> {
    const docRef = db.collection(USERS_COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
        return null;
    }

    const data = doc.data() as UserDocument;
    if (data.state === UserState.BLOCKED) {
        throw new Error("User is blocked");
    }

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
            filteredUpdates[key] = value;
        }
    }

    await docRef.update({
        ...filteredUpdates,
        updatedAt: FieldValue.serverTimestamp(),
    });

    const updated = await docRef.get();
    const updatedData = updated.data() as UserDocument;

    return await mapToGraphQL(id, updatedData, true);
}

export async function blockUser(id: string): Promise<boolean> {
    const docRef = db.collection(USERS_COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
        return false;
    }

    await docRef.update({
        state: UserState.BLOCKED,
        updatedAt: FieldValue.serverTimestamp(),
    });

    return true;
}

export function getUserReference(userId: string) {
    return db.collection(USERS_COLLECTION).doc(userId);
}

async function mapToGraphQL(id: string, data: UserDocument, isCurrentUser = false): Promise<User> {
    let usedQuotaBytes: number | null = null;
    let totalQuotaBytes: number | null = null;

    if (isCurrentUser) {
        const quotaInfo = await getUserQuotaInfo(id, data);
        usedQuotaBytes = quotaInfo.usedBytes;
        totalQuotaBytes = quotaInfo.totalQuotaBytes;
    }

    return {
        id,
        publicName: data.publicName || null,
        biography: data.biography || null,
        website: data.website || null,
        publicEmail: data.publicEmail || null,
        socialAccounts: data.socialAccounts || [],
        editorLanguage: isCurrentUser ? data.editorLanguage || null : null,
        usedQuotaBytes,
        totalQuotaBytes,
    };
}