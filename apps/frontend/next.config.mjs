import { fileURLToPath } from 'url'
import { dirname } from 'path'
const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  async rewrites() {
    return [
      {
        source: '/api/v1/attachments/:id',
        destination: 'http://localhost:4000/api/v1/attachments/:id',
      },
    ]
  },
}

export default nextConfig
