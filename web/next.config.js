/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://api:5000/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
