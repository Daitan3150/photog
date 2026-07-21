export type AiMemoryCategory = string

export interface SeedAiMemory {
    title: string;
    content: string;
    category: AiMemoryCategory;
    priority: number;
}

/** DAITAN Portfolio 向けの初期学習データ */
export const AI_LAB_SEED_MEMORIES: SeedAiMemory[] = [
    {
        title: 'サイトの目的とブランド',
        category: 'site_rule',
        priority: 5,
        content:
            'DAITAN Portfolio は北海道小樽を拠点に活動するフォトグラファー DAITAN（ダイタン）の公式ポートフォリオ。ポートレート・スナップ・コスプレ・風景・動物などの写真を公開し、出張撮影の依頼も受け付ける。公開URLは next-portfolio-lime-one.vercel.app。トーンはプロフェッショナルかつクリエイティブで、過度なセールス文句より作品と撮影体験を前面に出す。',
    },
    {
        title: '管理者とモデルの権限差',
        category: 'site_rule',
        priority: 5,
        content:
            'ロールは admin（管理者）と model（被写体・モデル）の2種類。管理者は全写真・スタジオ・招待・モデル管理・削除依頼・AI Lab・サイト設定にアクセス可能。モデルは自分の写真とプロフィールのみ管理し、UIはフューシャ/インディゴのダークテーマ。管理者はスレート/ブルーの管理画面。機能追加時は両ロールへの影響を必ず分けて考える。',
    },
    {
        title: '管理画面メニュー構成',
        category: 'workflow',
        priority: 4,
        content:
            '管理画面の主要メニュー: ダッシュボード、スタジオ管理（adminのみ）、写真管理、招待管理、モデル管理（subjects）、削除依頼、AI Lab、サイト設定（カバー画像）、プロフィール。ブログ管理は一時無効化中。新機能は既存サイドバーのグループ（Main Menu / admin only）に合わせて配置する。',
    },
    {
        title: '写真カテゴリーと公開条件',
        category: 'site_rule',
        priority: 5,
        content:
            'カテゴリー: cosplay（コスプレ）、portrait（ポートレート）、snapshot（スナップ）、landscape（風景）、animal（動物）、other、archived。カテゴリー未設定の写真はポートフォリオに公開されない。公開前にカテゴリー・タイトル等のメタデータを整える。アップロード自体はメタデータ未完成でも保存可能（Cloudinary URL必須）。',
    },
    {
        title: '写真アップロードの基本フロー',
        category: 'workflow',
        priority: 5,
        content:
            '1) Cloudinaryへ画像アップロード 2) タイトル・被写体名・撮影日・場所・カテゴリーを入力 3) コスプレならキャラ名・作品名・イベント名も入力 4) displayMode で title（作品タイトル表示）か character（キャラ名表示）を選択 5) 保存後キャッシュパージで公開ページに反映。被写体名を入力すると subjects コレクションへ自動登録される。',
    },
    {
        title: 'コスプレ撮影のメタデータ',
        category: 'workflow',
        priority: 4,
        content:
            'コスプレカテゴリーでは characterName（キャラ名）、seriesName（作品名）、event（イベント名）が重要。displayMode=character のとき公開ページではキャラ名を主タイトルとして表示。SEOとOGPにも反映される。イベント撮影（コミケ、ワンフェス等）の場合は event フィールドを必ず埋める。',
    },
    {
        title: 'モデル（被写体）管理の考え方',
        category: 'site_rule',
        priority: 4,
        content:
            'subjects コレクションでモデル/被写体を管理。本名表示のオン/オフ設定あり。プライバシー優先: 本名はデフォルト非公開を推奨。SNS URL（Instagram/X）を紐付け可能。招待経由でモデルアカウントを発行し、各自が MY GALLERY から自分の写真を管理する。',
    },
    {
        title: '削除依頼の対応方針',
        category: 'workflow',
        priority: 4,
        content:
            'モデルや関係者からの写真削除依頼は admin/requests で確認。対応は迅速かつ丁寧に。削除前に該当写真ID・理由・依頼者を確認。Firestore・Cloudinary・Algolia の3箇所から整合性を保って削除。公開キャッシュもパージする。',
    },
    {
        title: 'スタジオ管理',
        category: 'workflow',
        priority: 3,
        content:
            'studios で撮影スタジオ情報を管理。スタジオ名・住所・設備・カバー画像など。ロケ撮影とスタジオ撮影を分けてポートフォリオ上で紹介できる。新規スタジオ追加時は地図座標（latitude/longitude）も設定すると公開ページのマップ表示に使える。',
    },
    {
        title: '招待フロー',
        category: 'workflow',
        priority: 3,
        content:
            'admin/invite でモデル向け招待リンクを発行。招待を受けたユーザーは register フロー（terms → form）でアカウント作成。招待コードは使い捨てまたは期限付きで管理。モデル登録後は admin 画面に model ロールでログインし MY GALLERY から写真管理。',
    },
    {
        title: 'サイト設定（カバー画像）',
        category: 'workflow',
        priority: 3,
        content:
            'admin/settings/covers で各ページのカバー画像を設定可能（管理ダッシュボード背景など）。Cloudinary または設定済みストレージの URL を使用。変更は即 revalidate される想定。デザイン変更より画像差し替えで雰囲気を変える運用向き。',
    },
    {
        title: '画像ホスティングとストレージ',
        category: 'site_rule',
        priority: 4,
        content:
            '写真画像は Cloudinary（res.cloudinary.com）に保存。URL バリデーションで Cloudinary 以外は拒否。EXIF 情報（カメラ・レンズ）も保存・表示可能。モデルから exifRequest で EXIF 公開依頼が来る場合あり。focalPoint で OGP サムネイルのクロップ位置を調整。',
    },
    {
        title: '検索と Algolia',
        category: 'site_rule',
        priority: 3,
        content:
            '公開写真は Algolia に同期され /search で検索可能。写真保存・更新・削除時に syncPhotoToAlgolia が走る。新フィールドを検索対象にしたい場合は Algolia インデックス設定と sync ロジック両方を更新する。',
    },
    {
        title: 'キャッシュ戦略',
        category: 'site_rule',
        priority: 3,
        content:
            '公開写真は Worker/KV キャッシュ（public_photos, public_photos_v2_{category}）を使用。写真の保存・削除時は purgePublicCache で全カテゴリーキャッシュをクリアし revalidatePath。新機能で公開データを変える場合はキャッシュキー追加とパージ処理を忘れない。',
    },
    {
        title: 'SEO・OGP の基本方針',
        category: 'writing_style',
        priority: 4,
        content:
            'ページタイトル形式: 「{内容} | DAITAN フォトグラファー | 北海道・小樽」または「{写真タイトル} | {被写体名} | DAITAN Portfolio」。description は撮影内容・場所・被写体を簡潔に。キーワード詰め込みは避け、自然な日本語。コスプレはキャラ名+作品名、ポートレートは被写体+撮影地を含める。',
    },
    {
        title: '写真説明文の文体',
        category: 'writing_style',
        priority: 5,
        content:
            '短く余白を残す。主語を多用せず写真が主役のトーン。「〜しました」より「〜の一枚」「〜にて撮影」のような叙情的な短句。過度なハッシュタグ羅列は避ける。被写体への敬意を込め、勝手なネタバレや過激表現は使わない。英語併記は必要な場合のみ。',
    },
    {
        title: 'モデル紹介文の文体',
        category: 'writing_style',
        priority: 4,
        content:
            'モデル/被写体紹介は第三者視点で簡潔に。SNS リンクがあれば自然に誘導。本名非公開設定を尊重し、活動名のみ記載。コスプレイヤーは得意キャラ・イベント実績を1〜2文で。宣伝臭の強い文面は避ける。',
    },
    {
        title: 'UIデザインの好み',
        category: 'preference',
        priority: 4,
        content:
            '管理画面: 白背景+スレート/インディゴアクセント、rounded-2xl、font-black 見出し、控えめな shadow。公開サイト: ミニマルで写真が主役、ダーク/ライトのコントラストを活かす。過度なアニメーションは避け、framer-motion は要所のみ。モバイルファースト。',
    },
    {
        title: '機能追加の優先順位',
        category: 'preference',
        priority: 4,
        content:
            '優先度高: 写真管理の効率化、モデル体験向上、SEO/OGP改善、削除依頼対応の円滑化。優先度中: 検索強化、スタジオ情報拡充、EXIF 表示改善。優先度低: ブログ再開（現在無効）、大規模リデザイン。小さく出して検証→記憶に残すサイクルを好む。',
    },
    {
        title: '実装時の安全ルール',
        category: 'site_rule',
        priority: 5,
        content:
            '変更は「管理画面のみ」「公開ページ」「データ構造変更」に分類して影響範囲を先に決める。Firebase Admin は server-only。クライアントに秘密鍵を漏らさない。HTML タグ入力は XSS 防止で拒否。認証は Firebase Auth + ID トークン検証。破壊的操作（削除・一括更新）は confirm 必須。',
    },
    {
        title: 'AI Lab の使い方',
        category: 'workflow',
        priority: 4,
        content:
            'AI Lab は外部 API 不使用のローカル提案エンジン。Firestore ai_memories に保存した記憶（好み・サイトルール・文体・機能案・作業手順・メモ）を参照して提案を生成。記憶が増えるほど精度向上。重要度1〜5（高いほど優先）。相談例: 「モデル管理に追加したい機能」「写真説明の書き方」「次の改善タスク」。',
    },
    {
        title: 'よくある相談: 写真管理の改善',
        category: 'feature_idea',
        priority: 3,
        content:
            '写真管理で検討中の改善案: 一括カテゴリー変更、未分類写真のアラート強化、撮影日の部分公開（年のみ公開）設定の見直し、サムネイル並び替え（ドラッグ&ドrop）、EXIF 一括表示/非表示。実装前に admin のみか model にも必要かを決める。',
    },
    {
        title: 'よくある相談: モデル体験の改善',
        category: 'feature_idea',
        priority: 3,
        content:
            'モデル向け改善案: 自分の写真の公開/非公開トグル、削除依頼のステータス確認、プロフィール写真設定、撮影リクエストフォーム、通知（メール）。モデル UI はフューシャ/パープルのダークテーマを維持。管理者 UI と混同しないこと。',
    },
    {
        title: 'よくある相談: 公開ページの改善',
        category: 'feature_idea',
        priority: 3,
        content:
            '公開側改善案: カテゴリーフィルター強化、被写体別ギャラリー、撮影地マップ、関連写真レコメンド、Lightbox のシェア改善、lazy load 最適化。パフォーマンスと SEO を両立。Cloudinary の transform で適切なサイズ配信。',
    },
    {
        title: '技術スタック',
        category: 'note',
        priority: 3,
        content:
            'Next.js 16 App Router, React 19, Tailwind CSS, Firebase (Auth + Firestore), Cloudinary, Algolia, Vercel デプロイ, Resend（メール）, Sentry（エラー監視）。Server Actions 中心。環境変数: FIREBASE_*, CLOUDINARY_*, ALGOLIA_*, RESEND_* 等。.env.local で管理。',
    },
    {
        title: 'デプロイと本番確認',
        category: 'workflow',
        priority: 3,
        content:
            'Vercel に main ブランチ push で自動デプロイ。本番: next-portfolio-lime-one.vercel.app。変更後は管理画面と公開ページ両方で確認。Firestore ルール・環境変数が Vercel に設定済みか確認。ビルドエラーは Sentry と Vercel ログで追跡。',
    },
    {
        title: 'プライバシーと公開範囲',
        category: 'site_rule',
        priority: 5,
        content:
            '被写体のプライバシー最優先。本名・連絡先・住所など個人情報は最小限。モデルの公開設定（本名表示、撮影年の公開/非公開）を尊重。位置情報は必要以上に詳しく公開しない。削除依頼は理由を問わず真摯に対応。',
    },
    {
        title: '撮影地・位置情報の扱い',
        category: 'site_rule',
        priority: 3,
        content:
            'location（表示用）と address 系（都道府県・市区町村・郵便番号）を分離。Geocoding で座標取得可能。公開ページでは location を中心に表示し、詳細住所は必要最小限。小樽・北海道以外のロケ地も正確に記録。',
    },
    {
        title: 'バックアップと復旧',
        category: 'workflow',
        priority: 2,
        content:
            '管理ダッシュボードに BackupEmailButton あり。Firestore データの定期バックアップを検討。admin/help にログイン復旧フロー（ID ヒント、パスワードリセット）。Resend ドメイン未承認時は Firebase メールにフォールバック。',
    },
];
