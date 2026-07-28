/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async redirects() {
    return [
      // /chat was an early prototype page (predating the current chat flow
      // at "/"); it shipped stale ChatRoom → old text and can still be
      // reached by old bookmarks/links, so redirect instead of 404ing.
      { source: "/chat", destination: "/", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

module.exports = nextConfig;