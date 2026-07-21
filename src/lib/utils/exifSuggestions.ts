function normalizeLensText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/^[•\-\*\s]+/, '').trim();
}

function shouldIgnoreLensText(value: string): boolean {
  if (!value) return true;
  const normalized = value.replace(/^[•\-\*\s]+/, '').trim();
  if (!normalized) return true;
  if (normalized.startsWith('---')) return true;
  if (normalized.includes('Lenses')) return true;
  if (/^(section|section title|old|manual|mf|current)$/i.test(normalized)) return true;
  if (/(^|\s)(section|old|manual|mf|current)(\s|$)/i.test(normalized)) return true;
  // Exclude obvious section headers or category markers
  if (normalized.includes('｜') || /\b(system|main system|sub system|adapters?|adapter)\b/i.test(normalized)) return true;
  // Exclude simple labels like 'メイン機材' / 'サブ機材' / 'アダプター'
  if (/メイン|サブ機材|アダプター|サブシステム|メインシステム/.test(normalized)) return true;
  return false;
}

function extractStringFromValue(value: unknown): string {
  if (typeof value === 'string') return normalizeLensText(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value && typeof value === 'object') {
    if ('name' in value && typeof (value as { name?: unknown }).name === 'string') {
      return normalizeLensText((value as { name?: unknown }).name);
    }
    if ('label' in value && typeof (value as { label?: unknown }).label === 'string') {
      return normalizeLensText((value as { label?: unknown }).label);
    }
  }
  return '';
}

export function extractLensNamesFromProfileData(profileData: unknown): string[] {
  if (!profileData || typeof profileData !== 'object') return [];

  const lensSources = [
    // Use only explicit lens lists to avoid picking up camera names from general gear
    (profileData as { lenses?: unknown }).lenses,
    (profileData as { lensDetails?: unknown }).lensDetails,
  ];

  const lensNames = new Set<string>();

  const addValues = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (Array.isArray(entry)) {
          entry.forEach(addValues);
          return;
        }
        const text = extractStringFromValue(entry);
        if (text && !shouldIgnoreLensText(text)) {
          lensNames.add(text);
        }
      });
      return;
    }

    const text = extractStringFromValue(value);
    if (text && !shouldIgnoreLensText(text)) {
      lensNames.add(text);
    }
  };

  lensSources.forEach(addValues);

  return Array.from(lensNames);
}
