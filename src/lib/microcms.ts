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
        console.warn("MicroCMS client is not initialized (missing API keys).");
        return { contents: [], totalCount: 0, offset: 0, limit: 0 };
    }

    try {
        // --- 🧠 記憶 (Memory): KV Cache ---
        const cacheKey = `blogs_${JSON.stringify(queries || {})}`;
        const cached = await getCachedData<any>(cacheKey);
        if (cached) return cached;

        const data = await client.getList<Blog>({
            endpoint: "blogs",
            queries,
        });

        // 🔥 Cache the result
        await setCachedData(cacheKey, data);
        return data;
    } catch (error) {
        console.error("MicroCMS getList error:", error);
        return { contents: [], totalCount: 0, offset: 0, limit: 0 };
    }
};

export const getBlogDetail = async (
    contentId: string,
    queries?: MicroCMSQueries
) => {
    if (!client) {
        throw new Error("MicroCMS client is not initialized.");
    }

    try {
        // --- 🧠 記憶 (Memory): KV Cache ---
        const cacheKey = `blog_detail_${contentId}_${JSON.stringify(queries || {})}`;
        const cached = await getCachedData<Blog>(cacheKey);
        if (cached) return cached;

        const data = await client.getListDetail<Blog>({
            endpoint: "blogs",
            contentId,
            queries,
        });

        // 🔥 Cache the result
        await setCachedData(cacheKey, data);
        return data;
    } catch (error) {
        console.error("MicroCMS getBlogDetail error:", error);
        throw error;
    }
};
