import type { NextConfig } from "next";

const defaultAllowedDevOrigins = ['localhost', '127.0.0.1', '192.168.56.1'];

const normalizeAllowedDevOrigin = (value: string): string | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    return new URL(trimmed).hostname;
  } catch {
    const normalized = trimmed
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .replace(/:\d+$/, '')
      .trim();

    return normalized.length > 0 ? normalized : null;
  }
};

const envAllowedDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? '')
  .split(',')
  .map(normalizeAllowedDevOrigin)
  .filter((origin): origin is string => origin !== null);

const allowedDevOrigins = Array.from(new Set([...defaultAllowedDevOrigins, ...envAllowedDevOrigins]));

const nextConfig: NextConfig = {
  allowedDevOrigins,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
