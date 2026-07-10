export function normalizeLensName(value: string | null | undefined): string {
    if (!value) return '';

    return value
        .normalize('NFKC')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[。.,;:：；]+$/g, '')
        .toLowerCase();
}

function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = Array.from({ length: b.length + 1 }, () => []);

    for (let i = 0; i <= b.length; i += 1) {
        matrix[i][0] = i;
    }
    for (let j = 0; j <= a.length; j += 1) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i += 1) {
        for (let j = 1; j <= a.length; j += 1) {
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + (a[j - 1] === b[i - 1] ? 0 : 1)
            );
        }
    }

    return matrix[b.length][a.length];
}

export function getSimilarLensNames(
    currentName: string,
    candidates: Array<string | null | undefined> = [],
    limit = 5
): string[] {
    const normalizedCurrent = normalizeLensName(currentName);
    if (!normalizedCurrent) return [];

    const scored = candidates
        .map((value) => {
            if (!value) return null;
            const normalized = normalizeLensName(value);
            if (!normalized || normalized === normalizedCurrent) return null;

            const distance = levenshteinDistance(normalizedCurrent, normalized);
            const includeScore = normalizedCurrent.includes(normalized) || normalized.includes(normalizedCurrent) ? 0 : 1;
            const score = distance + includeScore;

            return { value, score };
        })
        .filter((item): item is { value: string; score: number } => !!item)
        .sort((a, b) => a.score - b.score)
        .slice(0, limit)
        .map((item) => item.value);

    return Array.from(new Set(scored));
}

export function buildLensDatalistOptions(
    masterLenses: Array<string | null | undefined> = [],
    additionalLenses: Array<string | null | undefined> = [],
    historyLenses: Array<string | null | undefined> = []
): string[] {
    const entries = new Map<string, { display: string; priority: number }>();

    const addValue = (value: string | null | undefined, priority: number) => {
        if (!value) return;

        const trimmed = value.trim().replace(/\s+/g, ' ');
        if (!trimmed) return;

        const normalized = normalizeLensName(trimmed);
        if (!normalized) return;

        const existing = entries.get(normalized);
        if (!existing || priority > existing.priority) {
            entries.set(normalized, { display: trimmed, priority });
        }
    };

    masterLenses.forEach((lens) => addValue(lens, 3));
    additionalLenses.forEach((lens) => addValue(lens, 2));
    historyLenses.forEach((lens) => addValue(lens, 1));

    return Array.from(entries.values())
        .sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            return a.display.localeCompare(b.display, 'ja', { sensitivity: 'base' });
        })
        .map((entry) => entry.display);
}
