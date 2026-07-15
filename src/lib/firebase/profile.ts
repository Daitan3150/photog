import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface LensDetail {
    id?: string;
    name?: string;
    imageUrl?: string;
    manufacturer?: string;
    focalLength?: string;
    aperture?: string;
    mount?: string;
    releaseYear?: string;
    lensConstruction?: string;
    minimumFocusDistance?: string;
    filterDiameter?: string;
    comment?: string;
    description?: string;
    specs?: string[];
}

export interface GearItem {
    manufacturer: string;
    modelName: string;
    category?: string;
}

export type GearEntry = string | GearItem;

export const createGearItem = (manufacturer = '', modelName = '', category = ''): GearItem => ({
    manufacturer: manufacturer.trim(),
    modelName: modelName.trim(),
    ...(category ? { category: category.trim() } : {}),
});

export const normalizeGearEntry = (value: GearEntry | null | undefined): GearItem => {
    if (typeof value === 'string') {
        return createGearItem('', value);
    }

    if (value && typeof value === 'object') {
        return createGearItem(value.manufacturer || '', value.modelName || '', value.category || '');
    }

    return createGearItem();
};

export const normalizeGearList = (value: GearEntry[] | null | undefined): GearItem[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item) => normalizeGearEntry(item))
        .filter((item) => item.manufacturer || item.modelName);
};

export interface Profile {
    name: string;
    roleJa?: string;
    roleEn?: string;
    locationJa?: string;
    locationEn?: string;
    bioJa?: string;
    bioEn?: string;
    conceptJa?: string;
    conceptEn?: string;
    visionJa?: string;
    visionEn?: string;
    // Gear categorization
    mainGear?: (string | GearItem)[];
    subGear?: (string | GearItem)[];
    lenses?: (string | GearItem)[];
    otherGear?: (string | GearItem)[]; // [NEW] Other category
    // Legacy fields for compatibility
    role: string;
    location: string;
    bio: string;
    gear: string[];
    imageUrl?: string;
    xUrl?: string; // [NEW] Admin SNS
    instagramUrl?: string; // [NEW] Admin SNS
    lensDetails?: LensDetail[];
    ignoredLensMergeCandidates?: string[];
}

const PROFILE_DOC_PATH = 'settings/profile';

export const getProfile = async (): Promise<Profile | null> => {
    try {
        const docRef = doc(db, PROFILE_DOC_PATH);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as Profile;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error getting profile:', error);
        return null;
    }
};

export const saveProfile = async (profile: Profile): Promise<boolean> => {
    try {
        const docRef = doc(db, PROFILE_DOC_PATH);
        await setDoc(docRef, profile, { merge: true });
        return true;
    } catch (error) {
        console.error('Error saving profile:', error);
        return false;
    }
};
