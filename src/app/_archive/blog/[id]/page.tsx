import { getBlogDetail, getBlogs } from "@/lib/microcms";
import Image from "next/image";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import parse from "html-react-parser";

// Generate static params for existing posts
export async function generateStaticParams() {
    const { contents } = await getBlogs();

    return contents.map((post: any) => ({
        id: post.id,
    }));
}

// Revalidating every hour
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { id: string } }) {
    const post = await getBlogDetail(params.id).catch(() => null);
    if (!post) return {};

    return {
        title: `${post.title} | DAITAN Portfolio`,
        description: (post.content || '').substring(0, 100).replace(/<[^>]*>?/gm, ''),
        openGraph: {
            images: [post.eyecatch?.url || '/images/hero.png'],
        },
    };
}

export default async function BlogPostPage({ params }: { params: { id: string } }) {
    const post = await getBlogDetail(params.id).catch(() => null);

    if (!post) {
        notFound();
    }

    return (
        <div className="min-h-screen pt-32 pb-20 px-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-12 text-center">
                <div className="flex items-center justify-center gap-3 text-sm text-gray-500 tracking-widest uppercase mb-4">
                    <time dateTime={post.publishedAt}>
                        {format(new Date(post.publishedAt || post.createdAt || new Date()), "yyyy.MM.dd")}
                    </time>
                    {post.category && (
                        <>
                            <span>/</span>
                            <span>{post.category.name}</span>
                        </>
                    )}
                </div>
                <h1 className="text-3xl md:text-5xl font-serif leading-tight">
                    {post.title}
                </h1>
            </div>

            {/* Eyecatch */}
            {post.eyecatch && (
                <div className="relative w-full aspect-video mb-12 bg-gray-100">
                    <Image
                        src={post.eyecatch.url}
                        alt={post.title}
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
            )}

            {/* Content */}
            <article className="prose prose-lg max-w-none prose-img:rounded-lg prose-headings:font-serif">
                {parse(post.content || '')}
            </article>

            {/* Back Button */}
            <div className="mt-20 text-center">
                <a href="/blog" className="inline-block border-b border-black pb-1 hover:text-gray-600 transition-colors tracking-widest text-sm">
                    BACK TO LIST
                </a>
            </div>
        </div>
    );
}
