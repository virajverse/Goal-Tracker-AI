/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["i.pravatar.cc"],
  },
  eslint: {
    // Do not fail the production build on ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Do not fail the production build on type errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
