import React from 'react';
import PhotoGrid from '@/components/gallery/PhotoGrid';

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
  photos?: Array<any>;
}

export default function LensDetailPanel({ lensName, metadata, photoCount, photos = [] }: LensDetailPanelProps) {
  const parsedSpecs = metadata?.specs?.filter(Boolean).map((spec) => {
    const [label, ...rest] = spec.split(':');
    return {
      label: label.trim(),
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
    metadata?.comment ? { label: 'コメント', value: metadata.comment } : null,
  ].filter(Boolean) as Array<{ label: string; value?: string }>;

  return (
    <section className="mt-8">
      <div className="grid gap-5 md:grid-cols-[60%_40%] md:items-stretch md:gap-8">
        <div className="flex h-full items-center justify-center p-4 md:p-0 md:min-h-[320px]">
          <div className="overflow-hidden rounded-[24px] w-[210px] h-[210px] md:w-[420px] md:h-[420px]">
            {metadata?.imageUrl ? (
              <img src={metadata?.imageUrl} alt={lensName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                No Image
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-center min-w-0 md:min-h-[320px]">
          <h3 className="text-lg font-black leading-tight text-slate-900 md:text-xl max-w-full whitespace-nowrap overflow-hidden">{metadata?.name || lensName}</h3>
          {metadata?.description && (
            <p className="mt-3 text-sm leading-6 text-slate-600 md:text-sm">{metadata.description}</p>
          )}

          {displaySpecs.length > 0 && (
            <div className="mt-4 space-y-2 text-sm text-slate-700 md:text-sm">
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

      <div className="mt-10">
        {photos.length > 0 ? (
          <PhotoGrid photos={photos} />
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
            このレンズの作例はまだありません。
          </div>
        )}
      </div>
    </section>
  );
}
