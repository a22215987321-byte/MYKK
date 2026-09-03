import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="zh-Hant">
      <Head>
        <meta charSet="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
        {/* 專案檔案庫的文件內容區用襯線字（.pf-doc / RichTextEditor）。原本完全
            靠使用者本機有沒有裝中文襯線字體——沒裝的 Windows 會落到新細明體，
            筆畫細到看不舒服。這裡把 Noto Serif TC 正式載進來，每台機器一致。
            只取 500（內文）跟 800（標題／粗體）兩個字重：CJK 字體每多一個字重
            就多一整套，而 Google Fonts 會用 unicode-range 把 CJK 切成約 100 個
            分片、只下載實際用到的字，這是控制體積的關鍵。
            英文不受影響，仍走本機 Georgia。 */}
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@500;800&display=swap" rel="stylesheet" />
        <meta name="description" content="Evon Chat - 即時社交聊天平台，支援好友、群組、打賞功能" />
        <meta name="theme-color" content="#f4f3f9" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
              var t=localStorage.getItem('theme');
              if(!t){
                // No explicit choice saved yet — follow the OS/browser dark-mode
                // preference instead of always defaulting to the light theme.
                // Not persisted, so it keeps tracking the OS setting on later visits.
                t=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'neon':'default';
              }
              if(t&&t!=='default'){document.documentElement.setAttribute('data-theme',t);}
              if(t==='pastel-pearl'){
                var palettes=['champagne','coral-peach','mist-blue','lavender','pearl-silver','mint-sea-salt'];
                var p=localStorage.getItem('pastelPalette');
                if(palettes.indexOf(p)===-1)p='mist-blue';
                document.documentElement.setAttribute('data-pastel-palette',p);
              }
              var colors={default:'#f4f3f9',neon:'#090812',glass:'#eef1f7','pastel-pearl':'#f7f4ef','shadow-window':'#0d0f1a'};
              var meta=document.querySelector('meta[name="theme-color"]');
              if(meta&&colors[t])meta.setAttribute('content',colors[t]);
            }catch(e){}})();`,
          }}
        />

        {/* Favicon & PWA — ?v=2 query cache-busts these: browsers cache
            favicon/PWA icons very aggressively by filename, so overwriting
            the file content alone often doesn't refetch on already-visited
            devices. Bump this version string any time the logo changes
            again, otherwise returning visitors keep seeing the old one. */}
        <link rel="icon" href="/favicon.svg?v=3" type="image/svg+xml" />
        <link rel="icon" href="/icon-192.png?v=3" sizes="192x192" type="image/png" />
        <link rel="icon" href="/icon-512.png?v=3" sizes="512x512" type="image/png" />
        <link rel="shortcut icon" href="/favicon.svg?v=3" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=3" />
        <link rel="manifest" href="/manifest.json?v=3" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Evonchat" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {/* Open Graph (WhatsApp / Facebook) */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.evonchat.com" />
        <meta property="og:title" content="Evon Chat — 社交聊天平台" />
        <meta property="og:description" content="即時聊天、好友系統、群組、打賞排行榜，一站式社交體驗" />
        <meta property="og:image" content="https://www.evonchat.com/evonchat.png?v=3" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="zh_HK" />
        <meta property="og:site_name" content="Evon Chat" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Evon Chat — 社交聊天平台" />
        <meta name="twitter:description" content="即時聊天、好友系統、群組、打賞排行榜，一站式社交體驗" />
        <meta name="twitter:image" content="https://www.evonchat.com/evonchat.png?v=3" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
