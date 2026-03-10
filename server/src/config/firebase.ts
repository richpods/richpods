import { initializeApp } from "firebase/app";
import {
    getAuth,
    getRedirectResult,
} from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "",
    authDomain:
        process.env.FIREBASE_AUTH_DOMAIN || `${process.env.GOOGLE_CLOUD_PROJECT}.firebaseapp.com`,
    projectId: process.env.GOOGLE_CLOUD_PROJECT || "",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export {
    getRedirectResult,
};
