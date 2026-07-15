import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="zh-Hant">
      <Head>
        <meta charSet="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
        <meta name="description" content="Evon Chat - 即時社交聊天平台，支援好友、群組、打賞功能" />
        <meta name="theme-color" content="#f4f3f9" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t&&t!=='default'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`,
          }}
        />

        {/* Favicon & PWA */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/icon-192.png" sizes="192x192" type="image/png" />
        <link rel="icon" href="/icon-512.png" sizes="512x512" type="image/png" />
        <link rel="shortcut icon" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Evonchat" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {/* Open Graph (WhatsApp / Facebook) */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.evonchat.com" />
        <meta property="og:title" content="Evon Chat — 社交聊天平台" />
        <meta property="og:description" content="即時聊天、好友系統、群組、打賞排行榜，一站式社交體驗" />
        <meta property="og:image" content="https://www.evonchat.com/evonchat.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="zh_HK" />
        <meta property="og:site_name" content="Evon Chat" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Evon Chat — 社交聊天平台" />
        <meta name="twitter:description" content="即時聊天、好友系統、群組、打賞排行榜，一站式社交體驗" />
        <meta name="twitter:image" content="https://www.evonchat.com/evonchat.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
