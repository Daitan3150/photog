import { S3Client } from "@aws-sdk/client-s3";

if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ENDPOINT || !process.env.R2_BUCKET_NAME) {
    if (process.env.NODE_ENV === 'production') {
        console.warn("Missing R2 environment variables. Storage functionality may fail.");
    }
}

export const r2Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || 'dummy',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'dummy',
    },
});

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
