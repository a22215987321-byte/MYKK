import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { auth } from "../../lib/firebase";
import SpanishVerbConjugator from "../../components/SpanishVerbConjugator";

export default function SpanishVerbsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u); setLoaded(true);
      if (!u) window.location.href = "/";
    });
    return unsub;
  }, []);

  if (!loaded || !router.isReady) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--text-dim)", fontSize: 14, background: "var(--bg)" }}>
      載入中...
    </div>
  );

  const initialVerb = typeof router.query.verb === "string" ? router.query.verb : "";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <SpanishVerbConjugator initialVerb={initialVerb} onNav={() => window.history.back()} />
    </div>
  );
}
