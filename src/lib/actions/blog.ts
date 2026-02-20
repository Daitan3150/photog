'use server';

import { client } from '@/lib/microcms';
import { revalidatePath } from 'next/cache';

export async function createBlog(data: { title: string; content: string; categoryId?: string; eyecatchUrl?: string }) {
    if (!client) return { success: false, error: 'MicroCMS client not initialized' };

    try {
        const body: any = {
            title: data.title,
            content: data.content,
        };

        if (data.categoryId) body.category = data.categoryId;
        if (data.eyecatchUrl) body.eyecatch = { url: data.eyecatchUrl };

        await client.create({
            endpoint: 'blogs',
            content: body,
        });

        revalidatePath('/blog');
        return { success: true };
    } catch (error: any) {
        console.error('MicroCMS create error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateBlog(id: string, data: { title?: string; content?: string; categoryId?: string; eyecatchUrl?: string }) {
    if (!client) return { success: false, error: 'MicroCMS client not initialized' };

    try {
        const body: any = {};
        if (data.title) body.title = data.title;
        if (data.content) body.content = data.content;
        if (data.categoryId) body.category = data.categoryId;
        if (data.eyecatchUrl) body.eyecatch = { url: data.eyecatchUrl };

        await client.update({
            endpoint: 'blogs',
            contentId: id,
            content: body,
        });

        revalidatePath('/blog');
        revalidatePath(`/blog/${id}`);
        return { success: true };
    } catch (error: any) {
        console.error('MicroCMS update error:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteBlog(id: string) {
    if (!client) return { success: false, error: 'MicroCMS client not initialized' };

    try {
        await client.delete({
            endpoint: 'blogs',
            contentId: id,
        });

        revalidatePath('/blog');
        return { success: true };
    } catch (error: any) {
        console.error('MicroCMS delete error:', error);
        return { success: false, error: error.message };
    }
}

export async function getCategories() {
    if (!client) return [];
    try {
        const res = await client.getList({ endpoint: 'categories' });
        return res.contents;
    } catch (error) {
        console.error('MicroCMS getCategories error:', error);
        return [];
    }
}
