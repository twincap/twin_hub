/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  transpilePackages: ["@twin-hub/backend"]
};

export default nextConfig;
