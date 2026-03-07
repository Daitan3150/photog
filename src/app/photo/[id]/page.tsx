import { Metadata, ResolvingMetadata } from 'next';
import { getPhotoPublic } from '@/lib/actions/photos';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Share2, Camera, MapPin, Hash, User, Calendar, Grid, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { getRelatedPhotos } from '@/lib/algolia';
import LikeButton from '@/components/gallery/LikeButton';
import cloudinaryLoader from '@/lib/cloudinary-loader';
import MapEmbed from './MapEmbed';


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

    const formatShutterSpeed = (exposureTime: any) => {
        if (exposureTime === undefined || exposureTime === null || exposureTime === '') return null;

        let numericValue: number;

        if (typeof exposureTime === 'string') {
            if (exposureTime.includes('/')) {
                const [num, den] = exposureTime.split('/').map(Number);
                numericValue = num / den;
            } else {
                numericValue = parseFloat(exposureTime);
            }
        } else {
            numericValue = exposureTime;
        }

        if (isNaN(numericValue) || numericValue <= 0) return exposureTime; // Return raw if invalid

        if (numericValue >= 1) return `${Math.round(numericValue)}s`;
        const denominator = Math.round(1 / numericValue);
        return isNaN(denominator) ? exposureTime : `1/${denominator}`;
    };

    return (
        <div className="min-h-screen bg-[#fcfcfc] text-[#1a1a1a] selection:bg-black/10 transition-colors duration-500">
            {/* Header / Navigation */}
            <div className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent backdrop-blur-[2px]">
                <Link
                    href="/portfolio"
                    className="flex items-center gap-2 text-white/60 hover:text-white transition-all group"
                >
                    <div className="p-2 rounded-full border border-white/10 group-hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Gallery</span>
                </Link>

                <div className="flex items-center gap-6">
                    <div className="text-center">
                        <h1 className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/60">
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
                <div className={clsx(
                    "relative w-full max-w-5xl aspect-[2/3] md:aspect-[3/2] overflow-hidden group p-[2px] md:p-[4px]",
                    (photo.categoryId?.toLowerCase() === 'cosplay' || photo.category?.toLowerCase() === 'cosplay') && "bg-gradient-to-br from-purple-500 via-pink-500 to-amber-500 rounded-2xl shadow-2xl shadow-purple-500/40"
                )}>
                    <div className="relative w-full h-full overflow-hidden bg-white/50 rounded-xl shadow-inner border border-black/5">
                        <Image
                            loader={cloudinaryLoader as any}
                            src={photo.url}
                            alt={photo.title || 'Portfolio Photography'}
                            fill
                            priority
                            className="object-contain shadow-2xl transition-transform duration-700 group-hover:scale-[1.01]"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                        />

                        {/* Cosplay Luxury Sparkle Effect */}
                        {(photo.categoryId?.toLowerCase() === 'cosplay' || photo.category?.toLowerCase() === 'cosplay') && (
                            <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute top-4 right-4 animate-pulse">
                                    <Sparkles className="w-8 h-8 text-amber-400 fill-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                                </div>
                                <div className="absolute bottom-10 left-10 animate-pulse delay-1000">
                                    <Sparkles className="w-6 h-6 text-purple-400/60 fill-purple-300 drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Gorgeous Event Banner */}
                {photo.event && (
                    <div className="relative w-full max-w-lg mt-8 mb-4 group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-pink-500 to-amber-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                        <div className="relative p-6 bg-white border border-indigo-100 rounded-2xl flex flex-col items-center">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-[1px] w-6 bg-gradient-to-r from-transparent to-pink-500/30"></div>
                                <span className="text-[9px] uppercase tracking-[0.5em] text-pink-500 font-black flex items-center gap-2">
                                    <Sparkles className="w-3 h-3 fill-pink-500" />
                                    Special Event
                                </span>
                                <div className="h-[1px] w-6 bg-gradient-to-l from-transparent to-pink-500/30"></div>
                            </div>
                            <h3 className="text-3xl md:text-4xl font-black text-center tracking-tight leading-none py-2">
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-pink-600 to-amber-600 italic">
                                    {photo.event}
                                </span>
                            </h3>
                            <div className="absolute -top-3 -right-3">
                                <div className="bg-amber-100 p-2 rounded-xl shadow-lg border border-amber-200 animate-bounce">
                                    <Calendar className="w-5 h-5 text-amber-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Info Section */}
                <div className="mt-12 w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-black/5 pt-12 text-balance">
                    {/* Left: Metadata */}
                    <div className="space-y-8 text-center md:text-left">
                        <div>
                            <p className="text-[9px] uppercase tracking-[0.4em] text-black/30 font-bold mb-4">Photo Title</p>
                            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
                                {photo.displayMode === 'character' ? photo.characterName : (photo.title || '無題')}
                            </h2>
                            {photo.displayMode === 'character' && photo.title && (
                                <p className="text-black/40 text-lg font-medium italic underline underline-offset-8 decoration-pink-500/20">{photo.title}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div className="flex items-center gap-4 text-black/60 group">
                                <div className={clsx(
                                    "p-2.5 rounded-full border transition-all",
                                    (photo.categoryId?.toLowerCase() === 'cosplay' || photo.category?.toLowerCase() === 'cosplay') ? "bg-purple-50 border-purple-200 text-purple-600" : "bg-black/5 border-transparent"
                                )}>
                                    <User className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col flex-1 items-start">
                                    <span className="text-[9px] uppercase tracking-widest opacity-40 font-bold">
                                        {(photo.categoryId?.toLowerCase() === 'cosplay' || photo.category?.toLowerCase() === 'cosplay') ? 'Cosplayer' : 'Model'}
                                    </span>
                                    <span className={clsx(
                                        "text-base tracking-wide font-bold",
                                        (photo.categoryId?.toLowerCase() === 'cosplay' || photo.category?.toLowerCase() === 'cosplay') && "text-purple-600"
                                    )}>{photo.subjectName}</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-start gap-4">
                                <div className="flex items-center gap-4 text-black/60 group">
                                    <div className="p-2.5 rounded-full bg-black/5 border border-transparent group-hover:bg-black/10 transition-all">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="text-[9px] uppercase tracking-widest opacity-40 font-bold">Location</span>
                                        <span className="text-base tracking-wide font-bold">{photo.location}</span>
                                        {photo.address && (
                                            <span className="text-[10px] opacity-60 leading-tight mt-0.5">{photo.address}</span>
                                        )}
                                    </div>
                                </div>
                                {photo.latitude && photo.longitude && (
                                    <MapEmbed lat={photo.latitude} lng={photo.longitude} />
                                )}
                            </div>

                            <div className="flex items-center gap-4 text-black/60 group">
                                <div className="p-2.5 rounded-full bg-black/5 border border-transparent group-hover:bg-black/10 transition-all">
                                    <Hash className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-[9px] uppercase tracking-widest opacity-40 font-bold">Category</span>
                                    <span className="text-base tracking-wide font-black border-b-2 border-black/10 uppercase italic">{photo.category}</span>
                                </div>
                            </div>

                            {photo.shotAt && (
                                <div className="flex items-center gap-4 text-black/60 group">
                                    <div className="p-2.5 rounded-full bg-black/5 border border-transparent group-hover:bg-black/10 transition-all">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="text-[9px] uppercase tracking-widest opacity-50 font-bold">Date</span>
                                        <span className="text-base tracking-wide font-bold">
                                            {new Date(photo.shotAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Technical Data (EXIF) */}
                    <div className="space-y-8 bg-black/5 p-8 rounded-3xl border border-black/5">
                        <div>
                            <p className="text-[9px] uppercase tracking-[0.4em] text-black/40 font-bold mb-6">Shooting Data</p>
                            {photo.exif ? (
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-1 items-center md:items-start text-center md:text-left">
                                        <p className="text-[9px] text-black/30 uppercase tracking-widest font-bold">Camera & Lens</p>
                                        <p className="text-sm font-bold text-black/90">
                                            {photo.exif.Model || 'Generic Camera'}
                                        </p>
                                        <p className="text-[11px] text-black/60 font-medium leading-relaxed">
                                            {photo.exif.LensModel || 'Prime Lens'}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-6 border-t border-black/5">
                                        <div className="space-y-1">
                                            <p className="text-[9px] text-black/30 uppercase tracking-widest font-bold">Aperture</p>
                                            <p className="text-sm font-black">ƒ/{photo.exif.FNumber || '-'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] text-black/30 uppercase tracking-widest font-bold">Shutter</p>
                                            <p className="text-sm font-black">{formatShutterSpeed(photo.exif.ExposureTime) || '-'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] text-black/30 uppercase tracking-widest font-bold">ISO</p>
                                            <p className="text-sm font-black">{photo.exif.ISO || '-'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] text-black/30 uppercase tracking-widest font-bold">Focal Length</p>
                                            <p className="text-sm font-black">{photo.exif.FocalLength ? `${Math.round(photo.exif.FocalLength)}mm` : '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 bg-black/5 border border-dashed border-black/10 rounded-2xl flex flex-col items-center justify-center text-center">
                                    <Camera className="w-8 h-8 text-black/20 mb-3" />
                                    <p className="text-xs text-black/40 tracking-wider">No technical data available</p>
                                </div>
                            )}
                        </div>

                        {photo.snsUrl && (
                            <div className="pt-6 border-t border-black/5 text-center md:text-left">
                                <a
                                    href={photo.snsUrl.startsWith('http') ? photo.snsUrl : `https://x.com/${photo.snsUrl.replace('@', '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-8 py-3 bg-black text-white rounded-full text-xs font-black hover:bg-black/90 transition-all border border-transparent shadow-[0_10px_30px_rgba(0,0,0,0.1)] hover:-translate-y-1 active:scale-95"
                                >
                                    <Share2 className="w-3.5 h-3.5" />
                                    View on SNS
                                </a>
                            </div>
                        )}

                        <div className="pt-6 border-t border-black/5 flex items-center justify-between">
                            <p className="text-[9px] uppercase tracking-[0.3em] text-black/40 font-bold">Feedback</p>
                            <LikeButton photoId={id} />
                        </div>
                    </div>
                </div>

                {/* Related Photos Section */}
                {relatedPhotos.length > 0 && (
                    <div className="mt-32 w-full max-w-6xl border-t border-black/5 pt-20">
                        <div className="flex flex-col items-center mb-12">
                            <Grid className="w-5 h-5 text-black/30 mb-4" />
                            <h2 className="text-2xl font-black tracking-[0.2em] uppercase">Related Works</h2>
                            <p className="text-[10px] text-black/40 tracking-[0.4em] uppercase mt-2">Discover more</p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            {relatedPhotos.map((item: any) => (
                                <Link
                                    key={item.objectID}
                                    href={`/photo/${item.objectID}`}
                                    className="group block space-y-3"
                                >
                                    <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-gray-100 shadow-lg">
                                        <Image
                                            loader={cloudinaryLoader as any}
                                            src={item.url}
                                            alt={item.title}
                                            fill
                                            className="object-cover transition-transform duration-1000 group-hover:scale-110"
                                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 15vw"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                                            <span className="text-[9px] uppercase tracking-[0.3em] font-bold border border-white/40 px-3 py-1.5 backdrop-blur-sm text-white rounded-full">View Work</span>
                                        </div>
                                    </div>
                                    <div className="px-1 text-center md:text-left">
                                        <p className="text-[9px] text-black/40 uppercase tracking-widest truncate">{item.category}</p>
                                        <h3 className="text-[11px] font-bold tracking-wider truncate mt-1 group-hover:text-blue-600 transition-colors uppercase">{item.title}</h3>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-24 pb-12">
                    <Link
                        href="/portfolio"
                        className="text-[10px] uppercase tracking-[0.4em] text-black/30 hover:text-black transition-colors border border-black/10 px-8 py-4 rounded-full hover:bg-black/5 font-bold"
                    >
                        Explore All Works
                    </Link>
                </div>
            </main>
        </div>
    );
}
