import { logEvent } from 'firebase/analytics';
import { analytics } from './firebase';

/**
 * Track page views
 */
export const trackPageView = (pageName: string, pageUrl?: string) => {
    if (!analytics) return;

    logEvent(analytics, 'page_view', {
        page_name: pageName,
        page_url: pageUrl || window.location.href,
    });
};

/**
 * Track photo views
 */
export const trackPhotoView = (photoId: string, photoTitle: string, category?: string) => {
    if (!analytics) return;

    logEvent(analytics, 'view_photo', {
        photo_id: photoId,
        photo_title: photoTitle,
        category: category || 'uncategorized',
    });
};

/**
 * Track search queries
 */
export const trackSearch = (searchTerm: string, resultsCount: number) => {
    if (!analytics) return;

    logEvent(analytics, 'search', {
        search_term: searchTerm,
        results_count: resultsCount,
    });
};

/**
 * Track category selection
 */
export const trackCategorySelect = (categoryId: string, categoryName: string) => {
    if (!analytics) return;

    logEvent(analytics, 'select_category', {
        category_id: categoryId,
        category_name: categoryName,
    });
};

/**
 * Track photo uploads
 */
export const trackPhotoUpload = (uploadType: 'admin' | 'model', success: boolean) => {
    if (!analytics) return;

    logEvent(analytics, 'upload_photo', {
        upload_type: uploadType,
        success: success,
    });
};

/**
 * Track profile updates
 */
export const trackProfileUpdate = (success: boolean) => {
    if (!analytics) return;

    logEvent(analytics, 'update_profile', {
        success: success,
    });
};

/**
 * Track contact form submissions
 */
export const trackContactSubmit = () => {
    if (!analytics) return;

    logEvent(analytics, 'contact_submit');
};
