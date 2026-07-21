'use server';

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { revalidatePath } from "next/cache";
import { getCachedData, setCachedData, clearCachedData } from '@/lib/worker-cache';

export interface SiteSettings {
    covers: {
        home_portrait: string;
        home_snapshot: string;
        admin_dashboard: string;
    };
    ogp?: {
        siteImage: string;
    };
}

const SETTINGS_DOC_ID = "site_settings";

export async function getSiteSettings(): Promise<SiteSettings> {
    const cacheKey = 'site_settings';
    const cached = await getCachedData<SiteSettings>(cacheKey);
    if (cached) {
        return cached;
    }

    try {
        const docRef = doc(db, "settings", SETTINGS_DOC_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as SiteSettings;
            await setCachedData(cacheKey, data, 3600);
            return data;
        }

        // Return default settings if doc doesn't exist
        return {
            covers: {
                home_portrait: "/images/portrait.jpg",
                home_snapshot: "/images/snapshot.jpg",
                admin_dashboard: "",
            },
            ogp: {
                siteImage: "",
            }
        };
    } catch (error) {
        console.error("Error fetching site settings:", error);
        return {
            covers: {
                home_portrait: "/images/portrait.jpg",
                home_snapshot: "/images/snapshot.jpg",
                admin_dashboard: "",
            },
            ogp: {
                siteImage: "",
            }
        };
    }
}

export async function updateSiteSettings(settings: Partial<SiteSettings>) {
    try {
        const { getAdminFirestore } = await import("@/lib/firebaseAdmin");
        const adminDb = getAdminFirestore();
        const docRef = adminDb.collection("settings").doc(SETTINGS_DOC_ID);

        const current = await getSiteSettings();
        const updated = { ...current, ...settings };

        await docRef.set(updated, { merge: true });
        await clearCachedData('site_settings');

        revalidatePath("/");
        revalidatePath("/admin");

        return { success: true };
    } catch (error: any) {
        console.error("Error updating site settings:", error);
        return { success: false, error: error.message };
    }
}
