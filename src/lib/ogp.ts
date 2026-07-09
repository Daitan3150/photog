export interface OgImageOptions {
  x?: number;
  y?: number;
}

export function resolveOgImageSource(photo: { url?: string | null; shareOgImageUrl?: string | null }) {
  if (typeof photo?.shareOgImageUrl === 'string' && photo.shareOgImageUrl.trim()) {
    return photo.shareOgImageUrl.trim();
  }
  return typeof photo?.url === 'string' && photo.url.trim() ? photo.url.trim() : '';
}

export function buildCroppedOgImageUrl(
  imageUrl: string,
  focalPoint?: OgImageOptions,
  searchParam?: string
): string {
  if (!imageUrl.includes('res.cloudinary.com')) {
    return imageUrl;
  }

  let transform = 'c_fill,w_1200,h_630,q_auto,f_auto';

  if (searchParam) {
    const [xRaw, yRaw] = searchParam.split('_');
    const x = Math.round(parseFloat(xRaw || '50'));
    const y = Math.round(parseFloat(yRaw || '50'));
    transform = `c_fill,g_xy_center,x_${x}p,y_${y}p,w_1200,h_630,q_auto,f_auto`;
  } else if (focalPoint?.x !== undefined && focalPoint?.y !== undefined) {
    const x = Math.round(focalPoint.x);
    const y = Math.round(focalPoint.y);
    transform = `c_fill,g_xy_center,x_${x}p,y_${y}p,w_1200,h_630,q_auto,f_auto`;
  } else {
    transform = 'c_fill,g_auto,w_1200,h_630,q_auto,f_auto';
  }

  return imageUrl.replace('/upload/', `/upload/${transform}/`);
}
