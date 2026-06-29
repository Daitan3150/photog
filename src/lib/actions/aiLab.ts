'use server';

import { revalidatePath } from 'next/cache';

const COLLECTION_NAME = 'ai_memories';

export type AiMemoryCategory = 'preference' | 'site_rule' | 'writing_style' | 'feature_idea' | 'workflow' | 'note';

export interface AiMemory {
    id: string;
    title: string;
    content: string;
    category: AiMemoryCategory;
    priority: number;
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
}

const categoryLabels: Record<AiMemoryCategory, string> = {
    preference: '好み',
    site_rule: 'サイトルール',
    writing_style: '文体',
    feature_idea: '機能案',
    workflow: '作業手順',
    note: 'メモ',
};

function normalizeMemory(data: Partial<AiMemoryFormData>) {
    return {
        title: (data.title || '').trim(),
        content: (data.content || '').trim(),
        category: data.category || 'note',
        priority: Number.isFinite(data.priority) ? Number(data.priority) : 3,
    };
}

function tokenize(text: string) {
    return Array.from(new Set(
        text
            .toLowerCase()
            .replace(/[。、,.!?！？()[\]{}「」『』]/g, ' ')
            .split(/\s+/)
            .flatMap(part => part.length > 12 ? [part, part.slice(0, 12)] : [part])
            .filter(part => part.length >= 2)
    ));
}

function scoreMemory(memory: AiMemory, promptTokens: string[]) {
    const haystack = `${memory.title} ${memory.content} ${categoryLabels[memory.category]}`.toLowerCase();
    const matchScore = promptTokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
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

    const body = [
        `依頼内容: ${prompt}`,
        '',
        '参照した記憶:',
        memorySummary,
        '',
        wantsFeature
            ? 'まずは小さく追加できる形に分けるのが安全です。管理画面だけで完結する変更、公開ページに影響する変更、データ構造が変わる変更に分けて考えると失敗しにくくなります。'
            : wantsWriting
                ? '保存済みの好みや文体に寄せて、短く使いやすい文章から作るのが向いています。写真・モデル・SEOのどれに使う文章かを決めると精度が上がります。'
                : wantsRemember
                    ? 'この内容は学習メモとして保存できます。あとから編集や削除もできるので、まずは短いルールとして残すのが良いです。'
                    : '今の情報だけで無理に自動実行せず、記憶を使って次の作業候補を整理します。',
    ].join('\n');

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

export async function saveAiMemory(data: AiMemoryFormData): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const normalized = normalizeMemory(data);
        if (!normalized.title || !normalized.content) {
            return { success: false, error: 'タイトルと内容は必須です。' };
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
        const normalized = normalizeMemory(data);
        if (!normalized.title || !normalized.content) {
            return { success: false, error: 'タイトルと内容は必須です。' };
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
