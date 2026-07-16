import React from 'react';
import PhotoGrid, { type Photo } from '@/components/gallery/PhotoGrid';

interface LensMetadata {
  name?: string;
  imageUrl?: string;
  specs?: string[];
  description?: string;
  manufacturer?: string;
  focalLength?: string;
  aperture?: string;
  mount?: string;
  releaseYear?: string;
  lensConstruction?: string;
  minimumFocusDistance?: string;
  filterDiameter?: string;
  comment?: string;
}

interface LensDetailPanelProps {
  lensName: string;
  metadata?: LensMetadata;
  photoCount: number;
  photos?: Photo[];
}

export default function LensDetailPanel({ lensName, metadata, photos = [] }: LensDetailPanelProps) {
  const parsedSpecs = metadata?.specs?.filter(Boolean).map((spec) => {
    const [label, ...rest] = spec.split(':');
    const normalizedLabel = label.trim();
    return {
      label: normalizedLabel === 'コメント' ? 'レンズの特徴・コメント' : normalizedLabel,
      value: rest.join(':').trim() || undefined,
    };
  }) || [];

  const displaySpecs = parsedSpecs.length > 0 ? parsedSpecs : [
    metadata?.manufacturer ? { label: 'メーカー', value: metadata.manufacturer } : null,
    metadata?.focalLength ? { label: '焦点距離', value: metadata.focalLength } : null,
    metadata?.aperture ? { label: '開放F値', value: metadata.aperture } : null,
    metadata?.mount ? { label: 'マウント', value: metadata.mount } : null,
    metadata?.releaseYear ? { label: '発売年', value: metadata.releaseYear } : null,
    metadata?.lensConstruction ? { label: 'レンズ構成', value: metadata.lensConstruction } : null,
    metadata?.minimumFocusDistance ? { label: '最短撮影距離', value: metadata.minimumFocusDistance } : null,
    metadata?.filterDiameter ? { label: 'フィルター径', value: metadata.filterDiameter } : null,
    metadata?.comment ? { label: 'レンズの特徴・コメント', value: metadata.comment } : null,
  ].filter(Boolean) as Array<{ label: string; value?: string }>;

  return (
    <section className="mt-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,60%)_minmax(0,40%)] md:items-stretch md:gap-6">
        <div className="flex h-full items-center justify-center px-1 py-1 md:p-3 md:min-h-[280px]">
          <div className="w-full max-w-[220px] overflow-hidden rounded-[20px] aspect-square sm:max-w-[260px] md:max-w-[380px] md:rounded-[24px]">
            {metadata?.imageUrl ? (
              <img src={metadata?.imageUrl} alt={lensName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                No Image
              </div>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-center md:min-h-[280px]">
          <h3 className="max-w-full overflow-hidden text-base font-black leading-tight text-slate-900 break-words sm:text-lg md:text-xl md:whitespace-nowrap">{metadata?.name || lensName}</h3>

          {displaySpecs.length > 0 && (
            <div className="mt-3 space-y-2 text-sm text-slate-700 md:mt-3 md:text-sm">
              {displaySpecs.map((spec) => (
                <div key={spec.label} className="grid grid-cols-[auto_1fr] items-center gap-x-3 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {spec.label}
                  </span>
                  <span className="break-words text-left text-sm text-slate-700">{spec.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        {photos.length > 0 ? (
          <PhotoGrid photos={photos} variant="photos-only" />
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
            このレンズの作例はまだありません。
          </div>
        )}
      </div>
    </section>
  );
}
