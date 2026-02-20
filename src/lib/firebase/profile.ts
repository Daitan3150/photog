import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export interface Profile {
    name: string;
    roleJa?: string;
    roleEn?: string;
    locationJa?: string;
    locationEn?: string;
    bioJa?: string;
    bioEn?: string;
    // Gear categorization
    mainGear?: string[];
    subGear?: string[];
    lenses?: string[];
    otherGear?: string[]; // [NEW] Other category
    // Legacy fields for compatibility
    role: string;
    location: string;
    bio: string;
    gear: string[];
    imageUrl?: string;
    xUrl?: string; // [NEW] Admin SNS
    instagramUrl?: string; // [NEW] Admin SNS
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
