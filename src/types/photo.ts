export interface Photo {
    id?: string;
    uploaderId: string;
    url: string;
    publicId: string;
    title: string;
    subjectName: string; // Model or Layer name
    location: string;
    address?: string; // [NEW] Formal address from geocoding
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

export type PhotoFormData = Omit<Photo, 'id' | 'uploaderId' | 'createdAt' | 'updatedAt' | 'shotAt'> & {
    shotAt: string; // From date input
    characterName?: string;
    event?: string;
    categoryId?: string;
    displayMode: 'title' | 'character';
    exif?: any;
    tags?: string[];
};
