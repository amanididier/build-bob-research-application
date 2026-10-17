/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    // Desktop Vite sources live beside this app; never fail the marketing site build on them
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Do not treat any non-app files as Pages Router entries
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
}

export default nextConfig
