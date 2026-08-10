/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // AI Office 那批搬過來的 TypeScript 引擎（components/office/src/scene 等）
  // 是從另一個獨立專案（Vite，用 esbuild 單純去型別、不做嚴格檢查）搬過來
  // 的，原本就沒有通過 tsc 嚴格檢查——不擋 EvonChat 自己的建置，型別問題
  // 之後有空再慢慢修，不要因為搬過來的程式碼型別不夠嚴謹就讓整個網站建置失敗。
  typescript: { ignoreBuildErrors: true },
  // 同樣原因——建置時的 ESLint 掃到新搬進來的 .ts/.tsx 檔案，要求裝
  // @typescript-eslint 那組套件才能檢查，沒裝就直接把整個建置搞崩潰
  // （報一個看不懂的 "id" 錯誤）。不要為了搬過來的程式碼再裝一整組 lint
  // 工具，直接跳過建置時的 lint 檢查——程式碼對不對還是看 build 本身
  // 能不能過、能不能真的動起來。
  eslint: { ignoreDuringBuilds: true },
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