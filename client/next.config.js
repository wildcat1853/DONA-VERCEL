/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['drizzle-orm','@react-three/fiber', '@react-three/drei', 'three'],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "crypto": require.resolve("crypto-browserify"),
    };
    return config;
  },
};

module.exports = nextConfig;