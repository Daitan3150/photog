import { Metadata, ResolvingMetadata } from 'next';
import { getPhotoPublic } from '@/lib/actions/photos';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Share2, Camera, MapPin, Tag, User, Calendar, Grid } from 'lucide-react';
import { getRelatedPhotos } from '@/lib/algolia';
import LikeButton from '@/components/gallery/LikeButton';
import cloudinaryLoader from '@/lib/cloudinary-loader';


interface Props {
    params: Promise<{ id: string }>;
}

export async function generateMetadata(
    props: { params: Promise<{ id: string }>; searchParams: Promise<{ fp?: string }> },
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { id } = await props.params;
    const { fp } = await props.searchParams;
    const photo = await getPhotoPublic(id);

    if (!photo) return {};

    const baseTitle = photo.title || (photo.categoryId === 'cosplay' ? photo.characterName : 'Untitled');
    const title = `${baseTitle} | ${photo.subjectName ? `${photo.subjectName} | ` : ''}DAITAN Portfolio`;

    // Build a rich description
    const parts = [];
    if (photo.subjectName) parts.push(`Model: ${photo.subjectName}`);
    if (photo.location) parts.push(`Location: ${photo.location}`);
    if (photo.category) parts.push(`Category: ${photo.category}`);
    if (photo.tags && photo.tags.length > 0) parts.push(`Tags: ${photo.tags.slice(0, 5).join(', ')}`);

    const description = parts.length > 0 ? parts.join(' | ') : `Photography by DAITAN.`;

    // Dynamic OGP Image Generation with Focal Point
    let ogUrl = photo.url;
    if (ogUrl.includes('res.cloudinary.com')) {
        let transform = 'c_fill,w_1200,h_630,q_auto,f_auto';
        if (fp || (photo.focalPoint && photo.focalPoint.x !== undefined && photo.focalPoint.y !== undefined)) {
            const [x, y] = fp ? fp.split('_') : [photo.focalPoint?.x?.toString() || '50', photo.focalPoint?.y?.toString() || '50'];
            // Use focal point coordinates with fl_relative for robustness
            transform += `,g_xy_center,x_${x},y_${y},fl_relative`;
        } else {
            // Default to AI face/subject detection if no focal point provided
            transform += ',g_auto';
        }
        ogUrl = ogUrl.replace('/upload/', `/upload/${transform}/`);
    }

    return {
        title,
        description,
        keywords: photo.tags || [],
        openGraph: {
            title,
            description,
            images: [
                {
                    url: ogUrl,
                    width: 1200,
                    height: 630,
                }
            ],
            type: 'article',
            section: photo.category,
            tags: photo.tags,
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogUrl],
        },
    };
}

export default async function PhotoPage({ params }: Props) {
    const { id } = await params;
    const photo = await getPhotoPublic(id);

    if (!photo) {
        notFound();
    }

    const relatedPhotos = await getRelatedPhotos({
        photoId: id,
        category: photo.categoryId,
        tags: photo.tags,
        limit: 4
    });

    // URL optimization is handled by cloudinaryLoader

    const formatShutterSpeed = (exposureTime: number) => {
        if (!exposureTime) return null;
        if (exposureTime >= 1) return `${Math.round(exposureTime)}s`;
        return `1/${Math.round(1 / exposureTime)}`;
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-white/20">
            {/* Header / Navigation */}
            <div className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent backdrop-blur-[2px]">
                <Link
                    href="/portfolio"
                    className="flex items-center gap-2 text-white/60 hover:text-white transition-all group"
                >
                    <div className="p-2 rounded-full border border-white/10 group-hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] font-light">Gallery</span>
                </Link>

                <div className="flex items-center gap-6">
                    <div className="text-center">
                        <h1 className="text-sm font-light tracking-[0.3em] uppercase opacity-80">
                            {photo.category}
                        </h1>
                        <div className="h-[1px] w-4 bg-white/20 mx-auto mt-1" />
                    </div>
                </div>

                <div className="w-[100px] flex justify-end">
                    {/* Share button or placeholder */}
                </div>
            </div>

            <main className="container mx-auto px-4 py-24 md:py-32 flex flex-col items-center">
                {/* Photo Stage */}
                <div className="relative w-full max-w-5xl aspect-[2/3] md:aspect-[3/2] overflow-hidden group">
                    <Image
                        loader={cloudinaryLoader as any}
                        src={photo.url}
                        alt={photo.title || 'Portfolio Photography'}
                        fill
                        priority
                        className="object-contain shadow-2xl transition-transform duration-700 group-hover:scale-[1.02]"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                    />
                </div>

                {/* Info Section */}
                <div className="mt-16 w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-white/10 pt-12 text-balance">
                    {/* Left: Metadata */}
                    <div className="space-y-8">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold mb-4">Details</p>
                            <h2 className="text-3xl md:text-4xl font-light tracking-tight mb-2">
                                {photo.displayMode === 'character' ? photo.characterName : (photo.title || '無題')}
                            </h2>
                            {photo.displayMode === 'character' && photo.title && (
                                <p className="text-white/60 text-lg font-light italic">{photo.title}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-center gap-4 text-white/60 group">
                                <div className="p-2 rounded-lg bg-white/5 border border-white/5 group-hover:border-white/20 transition-all">
                                    <User className="w-4 h-4" />
                                </div>
                                <span className="text-sm tracking-wide">{photo.subjectName}</span>
                            </div>
                            <div className="flex items-center gap-4 text-white/60 group">
                                <div className="p-2 rounded-lg bg-white/5 border border-white/5 group-hover:border-white/20 transition-all">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <span className="text-sm tracking-wide">{photo.location}</span>
                            </div>
                            {photo.shotAt && (
                                <div className="flex items-center gap-4 text-white/60 group">
                                    <div className="p-2 rounded-lg bg-white/5 border border-white/5 group-hover:border-white/20 transition-all">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm tracking-wide">
                                        {new Date(photo.shotAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Technical Data (EXIF) */}
                    <div className="space-y-8">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold mb-6">Shooting Data</p>
                            {photo.exif ? (
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-[10px] text-white/30 uppercase tracking-widest">Camera & Lens</p>
                                        <p className="text-sm font-light text-white/90">
                                            {photo.exif.Model || 'Generic Camera'}
                                        </p>
                                        <p className="text-[11px] text-white/60 leading-relaxed">
                                            {photo.exif.LensModel || 'Prime Lens'}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t border-white/5">
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-white/30 uppercase tracking-widest">Aperture</p>
                                            <p className="text-sm font-medium">ƒ/{photo.exif.FNumber || '-'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-white/30 uppercase tracking-widest">Shutter</p>
                                            <p className="text-sm font-medium">{formatShutterSpeed(photo.exif.ExposureTime) || '-'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-white/30 uppercase tracking-widest">ISO</p>
                                            <p className="text-sm font-medium">{photo.exif.ISO || '-'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-white/30 uppercase tracking-widest">Focal Length</p>
                                            <p className="text-sm font-medium">{photo.exif.FocalLength ? `${Math.round(photo.exif.FocalLength)}mm` : '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 bg-white/5 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center">
                                    <Camera className="w-8 h-8 text-white/20 mb-3" />
                                    <p className="text-xs text-white/40 tracking-wider">No technical data available</p>
                                </div>
                            )}
                        </div>

                        {photo.snsUrl && (
                            <div className="pt-6 border-t border-white/5">
                                <a
                                    href={photo.snsUrl.startsWith('http') ? photo.snsUrl : `https://x.com/${photo.snsUrl.replace('@', '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-full text-xs font-bold hover:bg-white/90 transition-all border border-transparent shadow-[0_10px_30px_rgba(255,255,255,0.1)]"
                                >
                                    <Share2 className="w-3.5 h-3.5" />
                                    View on SNS
                                </a>
                            </div>
                        )}

                        <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold">Feedback</p>
                            <LikeButton photoId={id} />
                        </div>

                    </div>
                </div>

                {/* Related Photos Section */}
                {
                    relatedPhotos.length > 0 && (
                        <div className="mt-32 w-full max-w-6xl border-t border-white/10 pt-20">
                            <div className="flex flex-col items-center mb-12">
                                <Grid className="w-5 h-5 text-white/30 mb-4" />
                                <h2 className="text-2xl font-serif font-light tracking-[0.2em] uppercase">Related Works</h2>
                                <p className="text-[10px] text-white/40 tracking-[0.4em] uppercase mt-2">Discover more</p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                {relatedPhotos.map((item: any) => (
                                    <Link
                                        key={item.objectID}
                                        href={`/photo/${item.objectID}`}
                                        className="group block space-y-3"
                                    >
                                        <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-white/5">
                                            <Image
                                                loader={cloudinaryLoader}
                                                src={item.url}
                                                alt={item.title}
                                                fill
                                                className="object-cover transition-transform duration-1000 group-hover:scale-110"
                                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 15vw"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                                                <span className="text-[9px] uppercase tracking-[0.3em] font-bold border border-white/40 px-3 py-1.5 backdrop-blur-sm">View Work</span>
                                            </div>
                                        </div>
                                        <div className="px-1 text-center md:text-left">
                                            <p className="text-[9px] text-white/40 uppercase tracking-widest truncate">{item.category}</p>
                                            <h3 className="text-[11px] font-medium tracking-wider truncate mt-1 group-hover:text-white transition-colors">{item.title}</h3>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )
                }

                <div className="mt-24 pb-12">
                    <Link
                        href="/portfolio"
                        className="text-[10px] uppercase tracking-[0.4em] text-white/30 hover:text-white transition-colors border border-white/10 px-8 py-4 rounded-full hover:bg-white/5"
                    >
                        Explore All Works
                    </Link>
                </div>
            </main >
        </div >
    );
}
