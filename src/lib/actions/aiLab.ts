'use server';

import { revalidatePath } from 'next/cache';
import { inferAiMemoryCategory } from '@/lib/aiLab/inferMemoryCategory';

const COLLECTION_NAME = 'ai_memories';

export type AiMemoryCategory = 'preference' | 'site_rule' | 'writing_style' | 'feature_idea' | 'workflow' | 'note';

export interface AiMemory {
    id: string;
    title: string;
    content: string;
    category: AiMemoryCategory;
    priority: number;
    implemented?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface AiSuggestion {
    title: string;
    body: string;
    nextSteps: string[];
    usedMemories: string[];
}

export interface AiMemoryFormData {
    title: string;
    content: string;
    category: AiMemoryCategory;
    priority?: number;
    implemented?: boolean;
}

const categoryLabels: Record<AiMemoryCategory, string> = {
    preference: '好み',
    site_rule: 'サイトルール',
    writing_style: '文体',
    feature_idea: '機能案',
    workflow: '作業手順',
    note: 'メモ',
};

function normalizeMemory(data: Partial<AiMemoryFormData>, autoCategory = false) {
    const title = (data.title || '').trim();
    const content = (data.content || '').trim();
    const inferred = title && content ? inferAiMemoryCategory(title, content).category : null;

    let category = data.category || 'note';
    if (autoCategory && inferred && category === 'preference') {
        category = inferred;
    }

    const normalized: Partial<AiMemoryFormData> = {
        title,
        content,
        category,
        priority: Number.isFinite(data.priority) ? Number(data.priority) : 3,
    };

    if (data.implemented !== undefined) {
        normalized.implemented = data.implemented;
    }

    return normalized;
}

function prepareAiMemoryUpdate(data: Partial<AiMemoryFormData>): Partial<AiMemoryFormData> {
    const update: Partial<AiMemoryFormData> = {};

    if (typeof data.title === 'string' && data.title.trim()) {
        update.title = data.title.trim();
    }
    if (typeof data.content === 'string' && data.content.trim()) {
        update.content = data.content.trim();
    }
    if (data.category) {
        update.category = data.category;
    }
    if (Number.isFinite(data.priority)) {
        update.priority = Number(data.priority);
    }
    if (data.implemented !== undefined) {
        update.implemented = data.implemented;
    }

    return update;
}

const keywordHints: Record<string, string[]> = {
    写真: ['photo', 'photos', 'cloudinary', 'gallery', '撮影', 'アップロード', 'カテゴリー'],
    モデル: ['subject', 'subjects', '被写体', 'コスプレ', 'invite', '招待'],
    管理: ['admin', 'dashboard', '設定', '権限', 'ロール'],
    削除: ['request', 'requests', '依頼', 'remove'],
    文章: ['writing', 'seo', 'タイトル', 'description', 'キャプション', '説明'],
    機能: ['feature', '追加', '実装', '改善', '開発'],
    公開: ['portfolio', '公開', 'ogp', 'cache', 'algolia', '検索'],
    スタジオ: ['studio', 'studios', 'ロケ', 'location'],
};

function tokenize(text: string) {
    const normalized = text
        .toLowerCase()
        .replace(/[。、,.!?！？()[\]{}「」『』・]/g, ' ');

    const tokens = new Set<string>();

    for (const part of normalized.split(/\s+/)) {
        if (part.length >= 2) tokens.add(part);
        if (part.length > 12) tokens.add(part.slice(0, 12));
    }

    // 日本語は空白がないため、2〜4文字の n-gram でもトークン化
    const japaneseRuns = normalized.match(/[\u3040-\u30ff\u4e00-\u9faf]+/g) || [];
    for (const run of japaneseRuns) {
        if (run.length <= 4) {
            tokens.add(run);
            continue;
        }
        for (let size = 2; size <= 4; size++) {
            for (let i = 0; i <= run.length - size; i++) {
                tokens.add(run.slice(i, i + size));
            }
        }
    }

    for (const [hint, aliases] of Object.entries(keywordHints)) {
        if (normalized.includes(hint) || aliases.some(alias => normalized.includes(alias))) {
            tokens.add(hint);
            aliases.forEach(alias => tokens.add(alias));
        }
    }

    return Array.from(tokens).filter(part => part.length >= 2);
}

function scoreMemory(memory: AiMemory, promptTokens: string[]) {
    const haystack = `${memory.title} ${memory.content} ${categoryLabels[memory.category]}`.toLowerCase();
    let matchScore = 0;

    for (const token of promptTokens) {
        if (haystack.includes(token)) {
            matchScore += token.length >= 4 ? 2 : 1;
        }
    }

    if (memory.title && promptTokens.some(token => memory.title.toLowerCase().includes(token))) {
        matchScore += 2;
    }

    return matchScore * 3 + memory.priority;
}

function buildLocalSuggestion(prompt: string, memories: AiMemory[]): AiSuggestion {
    const tokens = tokenize(prompt);
    const ranked = memories
        .map(memory => ({ memory, score: scoreMemory(memory, tokens) }))
        .filter(item => item.score > item.memory.priority)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(item => item.memory);

    const promptLower = prompt.toLowerCase();
    const wantsFeature = /機能|追加|作り|実装|管理|変更|改修|ページ|ボタン|表示/.test(promptLower);
    const wantsWriting = /文章|説明|紹介|seo|タイトル|タグ|文体|投稿|キャプション/.test(promptLower);
    const wantsRemember = /覚えて|記憶|保存|メモ/.test(promptLower);

    const title = wantsRemember
        ? '記憶に残す内容の整理'
        : wantsFeature
            ? '機能追加の進め方'
            : wantsWriting
                ? '文章作成の方針'
                : 'AI Labからの提案';

    const memorySummary = ranked.length
        ? ranked.map(memory => `・${categoryLabels[memory.category]}: ${memory.title}`).join('\n')
        : '・まだ関連する記憶は少なめです。使うほど判断材料が増えます。';

    const memoryDetails = ranked.length
        ? ranked.slice(0, 3).map(memory => {
            const excerpt = memory.content.length > 120 ? `${memory.content.slice(0, 120)}…` : memory.content;
            return `【${memory.title}】\n${excerpt}`;
        }).join('\n\n')
        : '';

    const contextualAdvice = wantsFeature
        ? 'まずは小さく追加できる形に分けるのが安全です。管理画面だけで完結する変更、公開ページに影響する変更、データ構造が変わる変更に分けて考えると失敗しにくくなります。'
        : wantsWriting
            ? '保存済みの好みや文体に寄せて、短く使いやすい文章から作るのが向いています。写真・モデル・SEOのどれに使う文章かを決めると精度が上がります。'
            : wantsRemember
                ? 'この内容は学習メモとして保存できます。あとから編集や削除もできるので、まずは短いルールとして残すのが良いです。'
                : ranked.length
                    ? '保存済みの記憶をもとに、次に取るべき判断を整理しました。'
                    : '今の情報だけで無理に自動実行せず、記憶を使って次の作業候補を整理します。';

    const body = [
        `依頼内容: ${prompt}`,
        '',
        '参照した記憶:',
        memorySummary,
        memoryDetails ? `\n関連する記憶の要点:\n${memoryDetails}` : '',
        '',
        contextualAdvice,
    ].filter(Boolean).join('\n');

    const nextSteps = wantsFeature
        ? ['影響範囲を「管理画面のみ」か「公開ページにも反映」か決める', '必要な入力項目と保存先を決める', '実装前にAI Labのメモへルールを追加する']
        : wantsWriting
            ? ['用途を選ぶ: 写真説明 / モデル紹介 / SEO / お知らせ', '使いたい語尾や避けたい表現をメモに追加する', '生成した文章を採用したら、その傾向を記憶に残す']
            : wantsRemember
                ? ['タイトルを短くする', 'カテゴリを選んで保存する', '重要度を上げると次回の提案に反映されやすくなる']
                : ['関連する記憶を増やす', 'やりたい作業を一文で入力する', '提案を見て採用/修正の判断を残す'];

    return {
        title,
        body,
        nextSteps,
        usedMemories: ranked.map(memory => memory.id),
    };
}

export async function getAiMemories(): Promise<{ success: boolean; data: AiMemory[]; error?: string }> {
    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();
        const snapshot = await db.collection(COLLECTION_NAME).get();

        return {
            success: true,
            data: snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title || '',
                    content: data.content || '',
                    category: data.category || 'note',
                    priority: typeof data.priority === 'number' ? data.priority : 3,
                    implemented: data.implemented === true,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt ?? '',
                    updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt ?? '',
                };
            }).sort((a, b) => {
                if (b.priority !== a.priority) return b.priority - a.priority;
                return (b.updatedAt || '').localeCompare(a.updatedAt || '');
            }),
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'AIメモリーの取得に失敗しました。';
        return { success: false, data: [], error: message };
    }
}

export async function suggestAiMemoryCategory(title: string, content: string) {
    return inferAiMemoryCategory(title, content);
}

export async function saveAiMemory(data: AiMemoryFormData): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const normalized = normalizeMemory(data, true);
        if (!normalized.title || !normalized.content) {
            return { success: false, error: 'タイトルと内容は必須です。' };
        }
        if (normalized.implemented === undefined) {
            normalized.implemented = false;
        }

        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();
        const now = new Date();
        const docRef = await db.collection(COLLECTION_NAME).add({
            ...normalized,
            createdAt: now,
            updatedAt: now,
        });

        revalidatePath('/admin/ai-lab');
        return { success: true, id: docRef.id };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'AIメモリーの保存に失敗しました。';
        return { success: false, error: message };
    }
}

export async function updateAiMemory(id: string, data: Partial<AiMemoryFormData>): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: 'IDがありません。' };
        const normalized = prepareAiMemoryUpdate(data);
        if (!Object.keys(normalized).length) {
            return { success: false, error: '更新するデータがありません。' };
        }
        if ('title' in normalized && !normalized.title) {
            return { success: false, error: 'タイトルは必須です。' };
        }
        if ('content' in normalized && !normalized.content) {
            return { success: false, error: '内容は必須です。' };
        }

        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();
        await db.collection(COLLECTION_NAME).doc(id).update({
            ...normalized,
            updatedAt: new Date(),
        });

        revalidatePath('/admin/ai-lab');
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'AIメモリーの更新に失敗しました。';
        return { success: false, error: message };
    }
}

export async function markAiMemoriesImplemented(ids: string[]): Promise<{ success: boolean; updatedCount?: number; error?: string }> {
    try {
        if (!ids.length) {
            return { success: true, updatedCount: 0 };
        }

        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();
        const batch = db.batch();
        const now = new Date();

        ids.forEach(id => {
            const ref = db.collection(COLLECTION_NAME).doc(id);
            batch.update(ref, { implemented: true, updatedAt: now });
        });

        await batch.commit();
        revalidatePath('/admin/ai-lab');
        return { success: true, updatedCount: ids.length };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'AIメモリーの更新に失敗しました。';
        return { success: false, error: message };
    }
}

export async function deleteAiMemory(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: 'IDがありません。' };
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();
        await db.collection(COLLECTION_NAME).doc(id).delete();
        revalidatePath('/admin/ai-lab');
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'AIメモリーの削除に失敗しました。';
        return { success: false, error: message };
    }
}

export async function askLocalAiLab(prompt: string): Promise<{ success: boolean; suggestion?: AiSuggestion; error?: string }> {
    try {
        const cleanPrompt = prompt.trim();
        if (!cleanPrompt) return { success: false, error: '相談内容を入力してください。' };

        const memoriesResult = await getAiMemories();
        if (!memoriesResult.success) {
            return { success: false, error: memoriesResult.error || '記憶の読み込みに失敗しました。' };
        }

        const suggestion = buildLocalSuggestion(cleanPrompt, memoriesResult.data);
        return { success: true, suggestion };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'AI Labの提案作成に失敗しました。';
        return { success: false, error: message };
    }
}
