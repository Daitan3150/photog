#!/bin/bash

# --- DAITAN Portfolio Developer Janitor ---
# Disks space recovery and cleanup script

echo "🧹 Cleaning up development environment..."

# 1. Remove Next.js build cache
if [ -d ".next" ]; then
    echo "🗑️ Removing .next directory..."
    rm -rf .next
fi

# 2. Remove node_modules and lock file (Optional, uncomment if registry issues occur)
# echo "🗑️ Removing node_modules..."
# rm -rf node_modules package-lock.json

# 3. Clean npm cache
echo "🧼 Cleaning npm cache..."
npm cache clean --force

# 4. Remove system specific temp files
echo "📁 Cleaning temp files..."
rm -rf *.tsbuildinfo
find . -name ".DS_Store" -delete

# 5. Check if we need to prune old builds
# (Add specific paths if you have other build artifacts)

echo "✅ Cleanup complete!"
echo "🚀 Next step: Try running 'npm run dev' again."
