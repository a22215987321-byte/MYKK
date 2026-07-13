import { useState, useEffect } from "react";
import { auth, db } from "../../../lib/firebase";
import SpanishA1ListeningRoom from "../../../components/SpanishA1ListeningRoom";

export default function ListeningPracticePage() {
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoaded(true);
      if (!u) window.location.href = "/";
    });
    return unsub;
  }, []);

  if (!loaded) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--text-dim)", fontSize: 14, background: "var(--bg)" }}>
      載入中...
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <SpanishA1ListeningRoom user={user} db={db} />
    </div>
  );
}
