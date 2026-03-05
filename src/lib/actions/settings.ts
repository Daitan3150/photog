'use server';

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { revalidatePath } from "next/cache";

export interface SiteSettings {
    covers: {
        home_portrait: string;
        home_snapshot: string;
        admin_dashboard: string;
    };
}

const SETTINGS_DOC_ID = "site_settings";

export async function getSiteSettings(): Promise<SiteSettings> {
    try {
        const docRef = doc(db, "settings", SETTINGS_DOC_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as SiteSettings;
        }

        // Return default settings if doc doesn't exist
        return {
            covers: {
                home_portrait: "/images/portrait.jpg",
                home_snapshot: "/images/snapshot.jpg",
                admin_dashboard: "",
            }
        };
    } catch (error) {
        console.error("Error fetching site settings:", error);
        return {
            covers: {
                home_portrait: "/images/portrait.jpg",
                home_snapshot: "/images/snapshot.jpg",
                admin_dashboard: "",
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

        revalidatePath("/");
        revalidatePath("/admin");

        return { success: true };
    } catch (error: any) {
        console.error("Error updating site settings:", error);
        return { success: false, error: error.message };
    }
}
