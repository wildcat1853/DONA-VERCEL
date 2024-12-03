/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // If you need to temporarily ignore TS errors during build
    ignoreBuildErrors: true,
  },
  eslint: {
    // If you need to temporarily ignore ESLint errors during build
    ignoreDuringBuilds: true,
  }
}

module.exports = nextConfig 