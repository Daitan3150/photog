'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, Heart } from 'lucide-react';

export interface PhotoStats {
    views: number;
    likes: number;
}

type PhotoStatsResponse = Partial<PhotoStats> & { error?: string };

interface PhotoStatsActionsProps {
    photoId: string;
    trackView?: boolean;
    variant?: 'dark' | 'light';
}

async function fetchStats(photoId: string): Promise<PhotoStats> {
    const res = await fetch(`/api/photo-stats?id=${encodeURIComponent(photoId)}`, {
        cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch stats');
    const data = await res.json() as PhotoStatsResponse;
    return {
        views: typeof data.views === 'number' ? data.views : 0,
        likes: typeof data.likes === 'number' ? data.likes : 0,
    };
}

async function incrementStats(photoId: string, type: 'view' | 'like'): Promise<PhotoStats> {
    const res = await fetch(`/api/photo-stats?id=${encodeURIComponent(photoId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
    });
    if (!res.ok) throw new Error('Failed to update stats');
    const data = await res.json() as PhotoStatsResponse;
    return {
        views: typeof data.views === 'number' ? data.views : 0,
        likes: typeof data.likes === 'number' ? data.likes : 0,
    };
}

export default function PhotoStatsActions({ photoId, trackView = false, variant = 'dark' }: PhotoStatsActionsProps) {
    const [stats, setStats] = useState<PhotoStats>({ views: 0, likes: 0 });
    const [loading, setLoading] = useState(true);
    const [liked, setLiked] = useState(false);

    const storageKey = useMemo(() => `photo-liked-${photoId}`, [photoId]);

    useEffect(() => {
        let ignore = false;

        const load = async () => {
            try {
                const hasLiked = typeof window !== 'undefined' && localStorage.getItem(storageKey) === '1';
                if (!ignore) setLiked(hasLiked);

                const nextStats = trackView
                    ? await incrementStats(photoId, 'view')
                    : await fetchStats(photoId);
                if (!ignore) setStats(nextStats);
            } catch (error) {
                console.error('Failed to load photo stats', error);
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        load();

        return () => {
            ignore = true;
        };
    }, [photoId, storageKey, trackView]);

    const handleLike = async () => {
        if (liked) return;

        setLiked(true);
        setStats(prev => ({ ...prev, likes: prev.likes + 1 }));
        if (typeof window !== 'undefined') localStorage.setItem(storageKey, '1');

        try {
            const nextStats = await incrementStats(photoId, 'like');
            setStats(nextStats);
        } catch (error) {
            console.error('Failed to like photo', error);
            setLiked(false);
            setStats(prev => ({ ...prev, likes: Math.max(0, prev.likes - 1) }));
            if (typeof window !== 'undefined') localStorage.removeItem(storageKey);
        }
    };

    const isLight = variant === 'light';
    const baseText = isLight ? 'text-gray-500' : 'text-white/70';
    const border = isLight ? 'border-gray-200 bg-white hover:bg-gray-50' : 'border-white/10 bg-white/5 hover:bg-white/10';

    if (loading) {
        return <div className={`h-10 w-36 rounded-full animate-pulse ${isLight ? 'bg-gray-100' : 'bg-white/10'}`} />;
    }

    return (
        <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-full border ${border} ${baseText}`}>
                <Eye className="w-4 h-4" />
                <span className="text-xs font-bold tabular-nums">{stats.views}</span>
            </div>
            <button
                type="button"
                onClick={handleLike}
                disabled={liked}
                className={`group flex items-center gap-1.5 px-3 py-2 rounded-full border transition-all ${
                    liked
                        ? 'border-rose-200 bg-rose-50 text-rose-500'
                        : `${border} ${baseText} hover:text-rose-500`
                }`}
            >
                <Heart className={`w-4 h-4 transition-transform ${liked ? 'fill-current scale-110' : 'group-hover:scale-110'}`} />
                <span className="text-xs font-bold tabular-nums">{stats.likes}</span>
            </button>
        </div>
    );
}
