import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return ['/courses/:courseId', '/courses/:courseId/learn'].map(source => ({
      source,
      headers: [{
        key: 'Content-Security-Policy',
        value: "frame-src 'self' https://iframe.mediadelivery.net https://player.mediadelivery.net;",
      }],
    }));
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
