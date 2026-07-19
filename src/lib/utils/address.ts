export interface AddressParts {
  address?: string;
  addressZip?: string;
  addressPref?: string;
  addressCity?: string;
  addressDetail?: string;
}

export function buildFullAddress(parts: AddressParts) {
  const explicitAddress = (parts.address || '').trim();
  if (explicitAddress) return explicitAddress;

  const normalizedParts = [
    parts.addressZip ? `〒${parts.addressZip.trim()}` : '',
    parts.addressPref?.trim() || '',
    parts.addressCity?.trim() || '',
    parts.addressDetail?.trim() || '',
  ].filter(Boolean);

  return normalizedParts.join(' ');
}
