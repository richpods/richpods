import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
let app;
if (!getApps().length) {
    // Use Application Default Credentials (for GCP environments)
    // This will automatically use GOOGLE_APPLICATION_CREDENTIALS env var
    app = initializeApp({
        projectId: process.env.GOOGLE_CLOUD_PROJECT,
    });
} else {
    app = getApp();
}

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);