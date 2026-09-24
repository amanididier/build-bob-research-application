/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Automatically packages your server routes and pages into a self-contained local folder
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
