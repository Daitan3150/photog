export interface Location {
    id?: string;
    name: string;
    type: 'outdoor' | 'other';
    note?: string;
    address?: string;
    addressZip?: string;
    addressPref?: string;
    addressCity?: string;
    latitude?: number | null;
    longitude?: number | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export type LocationFormData = Omit<Location, 'id' | 'createdAt' | 'updatedAt'>;
