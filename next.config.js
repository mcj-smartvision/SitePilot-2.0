const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '12mb',
    },
  },
}
module.exports = nextConfig
