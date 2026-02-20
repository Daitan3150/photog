#!/bin/bash

# Load .env.local variables
source ../.env.local

echo "Setting secrets for next-portfolio-worker..."

# Function to put secret
put_secret() {
    local key=$1
    local value=$2
    if [ -z "$value" ]; then
        echo "Warning: $key is empty, skipping."
        return
    fi
    echo "Setting $key..."
    echo "$value" | npx wrangler secret put "$key"
}

put_secret "FIREBASE_PROJECT_ID" "$FIREBASE_PROJECT_ID"
put_secret "FIREBASE_CLIENT_EMAIL" "$FIREBASE_CLIENT_EMAIL"
put_secret "FIREBASE_PRIVATE_KEY" "$FIREBASE_PRIVATE_KEY"
put_secret "ALGOLIA_APP_ID" "$NEXT_PUBLIC_ALGOLIA_APP_ID"
put_secret "ALGOLIA_ADMIN_KEY" "$ALGOLIA_ADMIN_KEY"
put_secret "CLOUDINARY_API_KEY" "$CLOUDINARY_API_KEY"
put_secret "CLOUDINARY_API_SECRET" "$CLOUDINARY_API_SECRET"

echo "Done!"
