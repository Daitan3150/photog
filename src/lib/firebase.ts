import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getPerformance } from "firebase/performance";
import { getRemoteConfig, RemoteConfig, fetchAndActivate } from "firebase/remote-config";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: "daitan-portfolio.firebaseapp.com",
    projectId: "daitan-portfolio",
    storageBucket: "daitan-portfolio.firebasestorage.app",
    messagingSenderId: "1045568928629",
    appId: "1:1045568928629:web:aa6c88d95200b3b81d713c"
};

if (!firebaseConfig.apiKey) {
    console.warn("Firebase API Key is missing! Check your environment variables.");
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Analytics, Performance, Remote Config (client-side only)
let analytics: Analytics | null = null;
let performance: any | null = null;
let remoteConfig: RemoteConfig | null = null;

if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
    performance = getPerformance(app);
    remoteConfig = getRemoteConfig(app);

    // Remote Config settings
    if (remoteConfig) {
        remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour
        remoteConfig.defaultConfig = {
            maintenance_mode: false,
            banner_message: '',
            max_upload_size: 10485760, // 10MB
            featured_category: '',
        };
        fetchAndActivate(remoteConfig).catch(console.error);
    }
}

export { app, db, auth, storage, analytics, performance, remoteConfig };
