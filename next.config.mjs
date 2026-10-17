import path from 'path'
import { fileURLToPath } from 'url'

const root = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: { unoptimized: true },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': root,
      '@/components': path.join(root, 'components'),
      '@/lib': path.join(root, 'lib'),
      '@/app': path.join(root, 'app'),
    }
    config.resolve.modules = [
      root,
      path.join(root, 'node_modules'),
      ...(config.resolve.modules || []),
    ]
    config.resolve.extensions = [
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      '.json',
      ...(config.resolve.extensions || []),
    ]
    return config
  },
}

export default nextConfig
