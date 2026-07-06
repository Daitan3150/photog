export type PhotoCategoryId = 'cosplay' | 'portrait' | 'snapshot' | 'landscape' | 'animal' | 'other' | '';

export interface PhotoCategoryInput {
    title?: string;
    subjectName?: string;
    characterName?: string;
    seriesName?: string;
    event?: string;
    tags?: string[];
    displayMode?: 'title' | 'character';
}

export interface PhotoCategoryInference {
    categoryId: PhotoCategoryId;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
}

const COSPLAY = /コスプレ|cosplay|コミケ|コミックマーケット|ワンフェス|character|anime|キャラ|衣装|レイヤー|wonder festival|cff/i;
const PORTRAIT = /ポートレート|portrait|モデル|被写体|studio|スタジオ撮影|人物/i;
const SNAPSHOT = /スナップ|snapshot|street|街|日常|candid|旅|travel/i;
const LANDSCAPE = /風景|landscape|自然|山|海|空|夕日|夜景|scenery|nature/i;
const ANIMAL = /動物|animal|pet|犬|猫|鳥|wildlife|ペット/i;

function tagHaystack(tags: string[] = []) {
    return tags.join(' ').toLowerCase();
}

export function inferPhotoCategory(input: PhotoCategoryInput): PhotoCategoryInference {
    const text = [
        input.title,
        input.subjectName,
        input.characterName,
        input.seriesName,
        input.event,
        tagHaystack(input.tags),
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    if (!text.trim()) {
        return { categoryId: '', confidence: 'low', reason: '情報が不足しているため未設定のままです' };
    }

    const scores: { id: PhotoCategoryId; score: number; reason: string }[] = [];

    if (input.characterName?.trim() || input.seriesName?.trim() || input.event?.trim() || input.displayMode === 'character') {
        scores.push({ id: 'cosplay', score: 6, reason: 'キャラ名・作品名・イベント名が入力されています' });
    }
    if (COSPLAY.test(text)) {
        scores.push({ id: 'cosplay', score: 5, reason: 'コスプレ・イベント関連のキーワードがあります' });
    }
    if (ANIMAL.test(text)) {
        scores.push({ id: 'animal', score: 5, reason: '動物関連のキーワードがあります' });
    }
    if (LANDSCAPE.test(text) && !input.subjectName?.trim() && !input.characterName?.trim()) {
        scores.push({ id: 'landscape', score: 4, reason: '風景・自然関連のキーワードがあります' });
    }
    if (PORTRAIT.test(text)) {
        scores.push({ id: 'portrait', score: 3, reason: 'ポートレート・被写体関連のキーワードがあります' });
    }
    if (SNAPSHOT.test(text)) {
        scores.push({ id: 'snapshot', score: 3, reason: 'スナップ・日常関連のキーワードがあります' });
    }
    if (input.subjectName?.trim() && !input.characterName?.trim() && !input.seriesName?.trim()) {
        scores.push({ id: 'portrait', score: 2, reason: '被写体名のみ入力されています' });
    }

    const merged = new Map<PhotoCategoryId, { score: number; reasons: string[] }>();
    for (const item of scores) {
        const current = merged.get(item.id) || { score: 0, reasons: [] };
        merged.set(item.id, {
            score: current.score + item.score,
            reasons: [...current.reasons, item.reason],
        });
    }

    if (merged.size === 0) {
        return { categoryId: '', confidence: 'low', reason: '自動判定できませんでした。手動で選んでください' };
    }

    const ranked = Array.from(merged.entries()).sort((a, b) => b[1].score - a[1].score);
    const [categoryId, best] = ranked[0];
    const second = ranked[1]?.[1].score ?? 0;

    const confidence =
        best.score >= 5 && best.score > second * 1.3
            ? 'high'
            : best.score >= 3 && best.score > second
              ? 'medium'
              : 'low';

    return {
        categoryId,
        confidence,
        reason: best.reasons[0],
    };
}
