import type { AiMemoryCategory } from '@/lib/actions/aiLab';

const CATEGORY_RULES: { category: AiMemoryCategory; patterns: RegExp[]; weight: number }[] = [
    {
        category: 'writing_style',
        weight: 3,
        patterns: [
            /文体|文章|説明|キャプション|語尾|紹介文|seo|タイトル|description|書き方|表現|トーン|余白|短く|叙情的/,
        ],
    },
    {
        category: 'site_rule',
        weight: 3,
        patterns: [
            /ルール|方針|禁止|必須|プライバシー|公開条件|権限|ロール|admin|セキュリティ|xss|個人情報|非公開|削除.*方針/,
        ],
    },
    {
        category: 'workflow',
        weight: 2,
        patterns: [
            /手順|フロー|流れ|ステップ|確認|デプロイ|対応|チェック|アップロード.*流|招待.*流|依頼.*対応|運用/,
        ],
    },
    {
        category: 'feature_idea',
        weight: 2,
        patterns: [
            /機能|追加|改善案|実装|検討|開発|改修|ボタン|ui改善|欲しい|便利|提案|アイデア|feature/,
        ],
    },
    {
        category: 'preference',
        weight: 2,
        patterns: [
            /好み|好き|嫌い|優先|優先度|ui|デザイン|配色|見た目|トーン|ミニマル|アニメーション|rounded|font/,
        ],
    },
    {
        category: 'note',
        weight: 1,
        patterns: [
            /技術|stack|firebase|cloudinary|algolia|vercel|next\.?js|環境変数|メモ|備考|参考/,
        ],
    },
];

export interface CategoryInference {
    category: AiMemoryCategory;
    confidence: 'high' | 'medium' | 'low';
    label: string;
}

const CATEGORY_LABELS: Record<AiMemoryCategory, string> = {
    preference: '好み',
    site_rule: 'サイトルール',
    writing_style: '文体',
    feature_idea: '機能案',
    workflow: '作業手順',
    note: 'メモ',
};

export function inferAiMemoryCategory(title: string, content: string): CategoryInference {
    const text = `${title} ${content}`.toLowerCase();
    if (!text.trim()) {
        return { category: 'note', confidence: 'low', label: CATEGORY_LABELS.note };
    }

    const scores = new Map<AiMemoryCategory, number>();

    for (const rule of CATEGORY_RULES) {
        let ruleScore = 0;
        for (const pattern of rule.patterns) {
            if (pattern.test(text)) {
                ruleScore += rule.weight;
            }
        }
        if (ruleScore > 0) {
            scores.set(rule.category, (scores.get(rule.category) || 0) + ruleScore);
        }
    }

    if (scores.size === 0) {
        return { category: 'note', confidence: 'low', label: CATEGORY_LABELS.note };
    }

    const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
    const [category, topScore] = sorted[0];
    const secondScore = sorted[1]?.[1] ?? 0;

    const confidence =
        topScore >= 4 && topScore > secondScore * 1.5
            ? 'high'
            : topScore >= 2 && topScore > secondScore
              ? 'medium'
              : 'low';

    return {
        category,
        confidence,
        label: CATEGORY_LABELS[category],
    };
}
