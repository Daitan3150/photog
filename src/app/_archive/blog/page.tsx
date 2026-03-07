import { getBlogs } from "@/lib/microcms";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";

// Revalidating every hour
export const revalidate = 3600;

export default async function BlogPage() {
  const { contents: posts } = await getBlogs();

  if (!posts || posts.length === 0) {
    return (
      <div className="min-h-screen pt-32 px-6 flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-serif mb-4">Blog</h1>
        <p className="text-gray-500">No posts found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 px-6 pb-20 max-w-7xl mx-auto">
      <h1 className="text-4xl md:text-6xl font-serif text-center mb-16 tracking-widest uppercase">
        Blog
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {posts.map((post: any) => (
          <Link
            href={`/blog/${post.id}`}
            key={post.id}
            className="group flex flex-col gap-4"
          >
            <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100">
              {post.eyecatch?.url ? (
                <Image
                  src={post.eyecatch.url}
                  alt={post.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                  No Image
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 text-xs text-gray-500 tracking-widest uppercase">
                <time dateTime={post.publishedAt}>
                  {format(new Date(post.publishedAt || post.createdAt), "yyyy.MM.dd")}
                </time>
                {post.category && (
                  <>
                    <span>/</span>
                    <span>{post.category.name}</span>
                  </>
                )}
              </div>

              <h2 className="text-xl font-medium group-hover:text-gray-600 transition-colors line-clamp-2">
                {post.title}
              </h2>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
