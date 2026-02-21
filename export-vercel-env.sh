#!/bin/bash
# 🚀 Vercel への環境変数一括エクスポート用スクリプト

echo "--------------------------------------------------"
echo "Vercel 環境変数 設定用データ"
echo "これを Vercel の Settings > Environment Variables に貼り付けてください"
echo "--------------------------------------------------"

# Secrets from .env or local environment
echo "NEXT_PUBLIC_SENTRY_DSN=YOUR_SENTRY_DSN_HERE"
echo "DATABASE_URL=YOUR_NEON_DATABASE_URL_HERE"

# Logic to read current Firebase/Algolia keys if possible
if [ -f .env.local ]; then
    grep "FIREBASE_" .env.local
    grep "ALGOLIA_" .env.local
    grep "NEXT_PUBLIC_CLOUDINARY_" .env.local
fi

echo "--------------------------------------------------"
echo "Vercel Storage (KV/Blob) は、ダッシュボードの 'Storage' タブから"
echo "KV と Blob を作成して 'Connect' を押すだけで自動設定されます。"
echo "--------------------------------------------------"
