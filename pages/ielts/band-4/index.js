import { useState, useEffect } from "react";
import { auth } from "../../../lib/firebase";
import IeltsBand4 from "../../../components/IeltsBand4";

export default function IeltsBand4Page() {
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u); setLoaded(true);
      if (!u) window.location.href = "/";
    });
    return unsub;
  }, []);

  if (!loaded) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontSize: 14, background: "var(--bg)", color: "var(--text-muted)" }}>
      載入中...
    </div>
  );

  return <div style={{ minHeight: "100vh", background: "var(--bg)" }}><IeltsBand4 /></div>;
}
