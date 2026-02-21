import { createClient } from "microcms-js-sdk";
import type { MicroCMSQueries, MicroCMSImage, MicroCMSDate } from "microcms-js-sdk";
import { getCachedData, setCachedData } from "./worker-cache";

// Initialize Client
const domain = process.env.MICROCMS_SERVICE_DOMAIN;
const apiKey = process.env.MICROCMS_API_KEY;

export const client = (domain && apiKey)
    ? createClient({
        serviceDomain: domain,
        apiKey: apiKey,
    })
    : null;

// Types
export type Blog = {
    id: string;
    title: string;
    content: string;
    eyecatch?: MicroCMSImage;
    category?: Category;
} & MicroCMSDate;

export type Category = {
    id: string;
    name: string;
} & MicroCMSDate;

// API Functions
export const getBlogs = async (queries?: MicroCMSQueries) => {
    if (!client) {
        console.warn("[microCMS] Client not initialized. Please check MICROCMS_SERVICE_DOMAIN and MICROCMS_API_KEY.");
        return { contents: [], totalCount: 0, offset: 0, limit: 0 };
    }

    const endpoint = "blogs";
    try {
        const cacheKey = `blogs_${JSON.stringify(queries || {})}`;
        const cached = await getCachedData<any>(cacheKey);
        if (cached) return cached;

        const data = await client.getList<Blog>({
            endpoint,
            queries,
        });

        await setCachedData(cacheKey, data);
        return data;
    } catch (error: any) {
        console.error(`[microCMS] Error fetching from endpoint "${endpoint}":`, error.message);
        return { contents: [], totalCount: 0, offset: 0, limit: 0 };
    }
};

export const getBlogDetail = async (
    contentId: string,
    queries?: MicroCMSQueries
) => {
    if (!client) {
        throw new Error("[microCMS] Client not initialized.");
    }

    const endpoint = "blogs";
    try {
        const cacheKey = `blog_detail_${contentId}_${JSON.stringify(queries || {})}`;
        const cached = await getCachedData<Blog>(cacheKey);
        if (cached) return cached;

        const data = await client.getListDetail<Blog>({
            endpoint,
            contentId,
            queries,
        });

        await setCachedData(cacheKey, data);
        return data;
    } catch (error: any) {
        console.error(`[microCMS] Error fetching details for ID "${contentId}" from endpoint "${endpoint}":`, error.message);
        throw error;
    }
};
