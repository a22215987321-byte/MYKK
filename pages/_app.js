import { useEffect } from "react";
import Head from "next/head";
import "../styles/theme.css";
import ThemeToggle from "../components/ThemeToggle";
import InstallPrompt from "../components/InstallPrompt";

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
    </>
  );
}
