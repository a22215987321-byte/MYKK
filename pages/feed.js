import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import FeedApp from "../components/Feed";
import LoadingState from "../components/LoadingState";

export default function FeedPage() {
  const [user, setUser] = useState(undefined);
  const [authError, setAuthError] = useState('');
  const router = useRouter();

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        router.replace("/");
      }
    }, (e) => {
      console.error('[FeedPage] auth state listener failed', e);
      setAuthError('登入狀態驗證失敗，請重新整理頁面');
    });
  }, [router]);

  // Safety net: if the auth listener never calls back at all, don't leave
  // the user staring at a spinner forever.
  useEffect(() => {
    if (user !== undefined) return;
    const t = setTimeout(() => {
      setAuthError(prev => prev || '載入時間過長，可能是網路連線問題');
    }, 12000);
    return () => clearTimeout(t);
  }, [user]);

  if (user === undefined) {
    return (
      <LoadingState
        label="載入中..."
        error={authError || undefined}
        onRetry={authError ? () => window.location.reload() : undefined}
      />
    );
  }

  return <FeedApp user={user} />;
}
