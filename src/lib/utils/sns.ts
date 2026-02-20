/**
 * Detects the SNS service from a value and returns a clean URL.
 * Supports both full URLs and @usernames.
 */
export function getSnsUrl(value: string, typeHint?: string): string {
    if (!value) return '';
    const trimmed = value.trim();

    // If it's already a full URL, return it
    if (trimmed.startsWith('http')) return trimmed;

    // Handle @username or plain ID
    const id = trimmed.startsWith('@') ? trimmed.substring(1) : trimmed;

    switch (typeHint?.toLowerCase()) {
        case 'x':
        case 'twitter':
            return `https://x.com/${id}`;
        case 'instagram':
            return `https://instagram.com/${id}`;
        case 'tiktok':
            return `https://tiktok.com/@${id}`;
        case 'threads':
            return `https://threads.net/@${id}`;
        case 'youtube':
            return `https://youtube.com/@${id}`;
        default:
            // Generic heuristic if no hint is provided
            if (trimmed.includes('instagram.com')) return trimmed;
            if (trimmed.includes('x.com') || trimmed.includes('twitter.com')) return trimmed;
            return trimmed; // Fallback
    }
}
