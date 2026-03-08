export interface Photo {
    id?: string;
    uploaderId: string;
    url: string;
    publicId: string;
    title: string;
    subjectName: string; // Model or Layer name
    location: string;
    address?: string; // [NEW] Formal address from geocoding
    addressZip?: string; // [NEW] Zip code
    addressPref?: string; // [NEW] Prefecture
    addressCity?: string; // [NEW] City/Street/Building
    characterName?: string; // [NEW] For cosplayers
    event?: string; // [NEW] Event name (especially for cosplay)
    shotAt: Date; // Will be stored as Timestamp in Firestore
    snsUrl?: string; // Link to Instagram/X
    categoryId?: string; // Category ID
    displayMode: 'title' | 'character'; // [NEW] Choice A or B
    latitude?: number | null;
    longitude?: number | null;
    exif?: any; // [NEW] Camera/Lens info
    exifRequest?: boolean; // [NEW] Request from model to admin
    tags?: string[]; // [NEW] AI generated tags
    focalPoint?: { x: number; y: number }; // [NEW] For OGP crop
    createdAt: Date;
    updatedAt: Date;
}

export type PhotoFormData = Omit<Photo, 'id' | 'uploaderId' | 'createdAt' | 'updatedAt' | 'shotAt' | 'addressZip' | 'addressPref' | 'addressCity'> & {
    shotAt: string; // From date input
    addressZip?: string;
    addressPref?: string;
    addressCity?: string;
    characterName?: string;
    event?: string;
    categoryId?: string;
    displayMode: 'title' | 'character';
    exif?: any;
    tags?: string[];
};
