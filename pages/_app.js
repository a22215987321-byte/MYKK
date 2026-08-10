import { useEffect } from "react";
import Head from "next/head";
import "../globals.css";
import "../styles/theme.css";
// AI Office 的排版樣式——Next.js 規定 global CSS 只能在這裡 import。這份
// styles.css 已經整份跑過腳本，把 :root/body/裸標籤那些會全站漏出去的規則
// 拿掉，其餘每一條選擇器都加上 .ai-office-root 前綴（見
// components/office/office.css），所以平常不會影響到其他頁面，只有真的
// 進入 AI Office 模式（.ai-office-root 那個容器掛上去時）才會生效。
import "../components/office/office.css";
import ThemeToggle from "../components/ThemeToggle";
import InstallPrompt from "../components/InstallPrompt";
import ToastHost from "../components/ToastHost";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <ThemeToggle />
      <Component {...pageProps} />
      <InstallPrompt />
      <ToastHost />
    </>
  );
}
