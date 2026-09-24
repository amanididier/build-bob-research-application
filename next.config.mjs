/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Required to generate local static files for Electron
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
