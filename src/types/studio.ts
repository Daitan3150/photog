export interface Studio {
    id?: string;
    name: string;
    addressZip?: string;
    addressPref?: string;
    addressCity?: string;
    address?: string; // Full address
    url?: string;
    latitude?: number | null;
    longitude?: number | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export type StudioFormData = Omit<Studio, 'id' | 'createdAt' | 'updatedAt'>;
