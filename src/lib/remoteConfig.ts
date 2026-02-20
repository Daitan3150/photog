import { getValue } from 'firebase/remote-config';
import { remoteConfig } from './firebase';

/**
 * Check if maintenance mode is enabled
 */
export const isMaintenanceMode = (): boolean => {
    if (!remoteConfig) return false;

    try {
        return getValue(remoteConfig, 'maintenance_mode').asBoolean();
    } catch {
        return false;
    }
};

/**
 * Get banner message
 */
export const getBannerMessage = (): string => {
    if (!remoteConfig) return '';

    try {
        return getValue(remoteConfig, 'banner_message').asString();
    } catch {
        return '';
    }
};

/**
 * Get maximum upload size
 */
export const getMaxUploadSize = (): number => {
    if (!remoteConfig) return 10485760; // 10MB default

    try {
        return getValue(remoteConfig, 'max_upload_size').asNumber();
    } catch {
        return 10485760;
    }
};

/**
 * Get featured category ID
 */
export const getFeaturedCategory = (): string => {
    if (!remoteConfig) return '';

    try {
        return getValue(remoteConfig, 'featured_category').asString();
    } catch {
        return '';
    }
};
