import "dotenv/config";
import { Firestore } from "@google-cloud/firestore";

export const db = new Firestore({
    databaseId: process.env.FIRESTORE_DATABASE_ID || "(default)",
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    ignoreUndefinedProperties: true,
});

export const USERS_COLLECTION = "users";
export const RICHPODS_COLLECTION = "richpods";
export const CHAPTERS_SUBCOLLECTION = "chapters";
export const VERIFICATIONS_COLLECTION = "verifications";
export const UPLOADS_COLLECTION = "uploads";
export const HOSTED_PODCASTS_COLLECTION = "hosted_podcasts";
export const HOSTED_EPISODES_COLLECTION = "hosted_episodes";
