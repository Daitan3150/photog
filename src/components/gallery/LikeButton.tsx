'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';

interface LikeButtonProps {
    photoId: string;
}

export default function LikeButton({ photoId }: LikeButtonProps) {
    const [likes, setLikes] = useState<number | null>(null);
    const [liked, setLiked] = useState(false);
    const [loading, setLoading] = useState(true);

    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL || 'https://worker.daitan-portfolio.workers.dev';

    useEffect(() => {
        fetch(`${workerUrl}/api/photos/${photoId}/likes`)
            .then(res => res.json())
            .then((data: any) => {
                setLikes(data.value || 0);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch likes', err);
                setLoading(false);
            });
    }, [photoId, workerUrl]);

    const handleLike = async () => {
        if (liked) return; // Prevent multiple likes for now (simple implementation)

        // Optimistic update
        setLikes(prev => (prev || 0) + 1);
        setLiked(true);

        try {
            await fetch(`${workerUrl}/api/photos/${photoId}/like`, { method: 'POST' });
        } catch (error) {
            console.error('Failed to like', error);
            // Revert? Nah, just let it be for now
        }
    };

    if (loading) return <div className="animate-pulse w-8 h-8 rounded-full bg-white/10" />;

    return (
        <button
            onClick={handleLike}
            disabled={liked}
            className={`group flex items-center gap-2 px-4 py-2 rounded-full transition-all border ${liked
                    ? 'bg-pink-500/10 border-pink-500/50 text-pink-500'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-pink-400'
                }`}
        >
            <Heart className={`w-4 h-4 transition-transform ${liked ? 'fill-current scale-110' : 'group-hover:scale-110'}`} />
            <span className="text-xs font-medium tabular-nums">{likes !== null ? likes : '-'}</span>
        </button>
    );
}
