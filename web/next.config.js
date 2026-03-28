const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://voicetext-app-production.up.railway.app/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
