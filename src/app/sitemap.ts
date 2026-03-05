import { MetadataRoute } from 'next';
import { getRecentPhotos } from '@/lib/actions/photos';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://next-portfolio-lime-one.vercel.app';

    // Static pages
    const routes = [
        '',
        '/portfolio',
        '/about',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 1,
    }));

    // Dynamic pages (Photos)
    // Fetch a reasonable number of recent photos for sitemap (e.g., 100)
    // In a real large architecture, this might need pagination or a dedicated sitemap generation script
    const photos = await getRecentPhotos(100);

    const photoRoutes = photos.map((photo: any) => ({
        url: `${baseUrl}/photo/${photo.id}`,
        lastModified: photo.createdAt ? new Date(photo.createdAt) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }));

    return [...routes, ...photoRoutes];
}
