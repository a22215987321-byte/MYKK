import "../styles/theme.css";
import ThemeToggle from "../components/ThemeToggle";

export default function App({ Component, pageProps }) {
  return (
    <>
      <ThemeToggle />
      <Component {...pageProps} />
    </>
  );
}
