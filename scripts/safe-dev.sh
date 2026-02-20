#!/bin/bash

# --- DAITAN Portfolio Smart Dev Wrapper ---
# Ensures enough disk space before starting dev server

THRESHOLD_MB=1000 # 1GB threshold
FREE_SPACE_MB=$(df -m . | awk 'NR==2 {print $4}')

echo "📊 Checking disk space: ${FREE_SPACE_MB}MB free."

if [ "$FREE_SPACE_MB" -lt "$THRESHOLD_MB" ]; then
    echo "⚠️ Low disk space detected! Triggering automatic cleanup..."
    sh scripts/janitor.sh
    # Re-check space
    NEW_FREE_SPACE=$(df -m . | awk 'NR==2 {print $4}')
    echo "♻️ Optimized space. Now ${NEW_FREE_SPACE}MB free."
else
    echo "✨ Disk space is healthy."
fi

echo "🚀 Starting development server..."
npm run dev
