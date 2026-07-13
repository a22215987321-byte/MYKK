import { useState, useEffect } from "react";
import { auth } from "../../../lib/firebase";
import IeltsBand4Vocab from "../../../components/IeltsBand4Vocab";

export default function IeltsBand4VocabPage() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setLoaded(true);
      if (!u) window.location.href = "/";
    });
    return unsub;
  }, []);

  if (!loaded) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontSize: 14, background: "var(--bg)", color: "var(--text-muted)" }}>
      載入中...
    </div>
  );

  return <div style={{ height: "100vh", background: "var(--bg)" }}><IeltsBand4Vocab onNav={() => { window.location.href = "/ielts/band-4"; }} /></div>;
}
