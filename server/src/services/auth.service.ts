import { auth } from "../config/firebase.js";
import { adminAuth } from "../config/firebase-admin.js";
import {
    createUser,
    findUserByFirebaseUid,
    getUserByFirebaseUid,
    updateUser,
} from "./user.service.js";
import { User } from "../graphql.js";
import {
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithCredential,
    signInWithEmailAndPassword,
} from "firebase/auth";
import { type SupportedLanguage } from "@richpods/shared/i18n/language";
import type { UserRoleValue } from "../types/firestore.js";
import { normalizeRole } from "@richpods/shared/utils/roles";

const INVALID_CREDENTIALS_ERROR = "Invalid email or password";

async function resolveSignInUser(
    firebaseUid: string,
    editorLanguage: SupportedLanguage,
    providerLabel: string,
): Promise<User> {
    const lookup = await findUserByFirebaseUid(firebaseUid, true);

    if (lookup.status === "active") {
        return lookup.value;
    }

    if (lookup.status === "blocked") {
        console.warn(`Rejected ${providerLabel} sign-in of blocked user, uid: ${firebaseUid}`);
        throw new Error(INVALID_CREDENTIALS_ERROR);
    }

    console.warn(
        `Created missing ${providerLabel} user with existing valid credentials, uid: ${firebaseUid}`,
    );
    return await createUser(firebaseUid, editorLanguage);
}

export async function signUpWithEmailPassword(
    email: string,
    password: string,
    editorLanguage: SupportedLanguage,
): Promise<{ user: User; token: string }> {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        const user = await createUser(firebaseUser.uid, editorLanguage);
        const token = await firebaseUser.getIdToken();

        return {
            user,
            token,
        };
    } catch (error: any) {
        if (
            error.code === "auth/email-already-exists" ||
            error.code === "auth/email-already-in-use"
        ) {
            console.warn(`Sign-up attempt with existing email, code: ${error.code}`);
            throw new Error("Unable to create account. Please try again or sign in.");
        }
        if (error.code === "auth/weak-password") {
            throw new Error("Password is too weak");
        }
        throw error;
    }
}

export async function signInWithEmailPassword(
    email: string,
    password: string,
    editorLanguage: SupportedLanguage,
): Promise<{ user: User; token: string }> {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        const user = await resolveSignInUser(firebaseUser.uid, editorLanguage, "email/password");

        const token = await firebaseUser.getIdToken();

        return {
            user,
            token,
        };
    } catch (error: any) {
        if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
            throw new Error(INVALID_CREDENTIALS_ERROR);
        }
        if (error.code === "auth/invalid-credential" || error.code === "auth/user-disabled") {
            throw new Error(INVALID_CREDENTIALS_ERROR);
        }
        throw error;
    }
}

export async function signInWithGoogle(
    idToken: string,
    editorLanguage: SupportedLanguage,
): Promise<{ user: User; token: string }> {
    try {
        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        const firebaseUser = userCredential.user;

        const user = await resolveSignInUser(firebaseUser.uid, editorLanguage, "Google Auth");

        const token = await firebaseUser.getIdToken();

        return {
            user,
            token,
        };
    } catch (error: any) {
        throw new Error("Invalid Google ID token");
    }
}

export async function getUserFromToken(
    idToken: string,
): Promise<{ user: User; email: string | null; role: UserRoleValue | null } | null> {
    try {
        // Use Firebase Admin SDK to verify the ID token.
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // Read role from Firebase custom claims
        const role = normalizeRole(decodedToken.role);

        // Get the user from our database using the Firebase UID
        const user = await getUserByFirebaseUid(uid, true);
        if (!user) {
            return null;
        }

        return { user, email: decodedToken.email ?? null, role };
    } catch (error) {
        console.error("Error verifying token:", error);
        return null;
    }
}

export async function updateUserProfile(
    userId: string,
    updates: {
        publicName?: string;
        biography?: string;
        website?: string;
        publicEmail?: string;
        socialAccounts?: string[];
        editorLanguage?: SupportedLanguage;
    },
): Promise<User | null> {
    return await updateUser(userId, updates);
}
