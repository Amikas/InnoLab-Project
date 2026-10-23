const nextConfig = {
  output: 'standalone',
  trailingSlash: false,
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  turbopack: {
    root: '.'
  },
}
export default nextConfig