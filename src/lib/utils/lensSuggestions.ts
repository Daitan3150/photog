export function normalizeLensName(value: string | null | undefined): string {
    if (!value) return '';

    return value
        .normalize('NFKC')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[。.,;:：；]+$/g, '')
        .toLowerCase();
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
