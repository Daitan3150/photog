import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
  env: {
    // Cloudinary
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
    // Worker
    NEXT_PUBLIC_WORKER_URL: 'https://worker.daitan-portfolio.workers.dev',
    // App URL
    NEXT_PUBLIC_VERCEL_URL: 'https://next-portfolio-lime-one.vercel.app',
  },
  serverExternalPackages: ['sharp', 'jose', 'jwks-rsa'],
};

export default nextConfig;
