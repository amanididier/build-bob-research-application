/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server-side API routes and Better Auth are fully supported here
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
