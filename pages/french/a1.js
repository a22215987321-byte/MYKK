import { useState, useEffect } from "react";
import { auth, db } from "../../lib/firebase";
import FrenchA1Unit1 from "../../components/FrenchA1Unit1";

export default function FrenchA1Page() {
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--text-dim)", fontSize: 14, background: "var(--bg)" }}>
      載入中...
    </div>
  );

  return <div style={{ minHeight: "100vh", background: "var(--bg)" }}><FrenchA1Unit1 user={user} db={db} /></div>;
}
