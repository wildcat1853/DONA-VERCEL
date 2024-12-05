/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['drizzle-orm'],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "crypto": require.resolve("crypto-browserify"),
    };
    return config;
  },
}

module.exports = nextConfig 