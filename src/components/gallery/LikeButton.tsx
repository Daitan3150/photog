'use client';

import PhotoStatsActions from './PhotoStatsActions';

interface LikeButtonProps {
    photoId: string;
}

export default function LikeButton({ photoId }: LikeButtonProps) {
    return <PhotoStatsActions photoId={photoId} trackView={true} variant="dark" />;
}
