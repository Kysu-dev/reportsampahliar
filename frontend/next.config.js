const defaultAllowedDevOrigins = ['localhost', '127.0.0.1', '192.168.56.1'];

const normalizeAllowedDevOrigin = (value) => {
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
  .filter((origin) => origin !== null);

const allowedDevOrigins = Array.from(new Set([...defaultAllowedDevOrigins, ...envAllowedDevOrigins]));
const nextMajorVersion = Number.parseInt((require('next/package.json').version ?? '0').split('.')[0], 10);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  allowedDevOrigins,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
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

if (Number.isFinite(nextMajorVersion) && nextMajorVersion < 16) {
  nextConfig.eslint = {
    ignoreDuringBuilds: true,
  };
}

module.exports = nextConfig;