/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion', 'reactflow'],
  },
  async redirects() {
    return [{ source: '/sign-in', destination: '/', permanent: false }];
  },
};

export default nextConfig;
