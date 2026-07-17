import Link from "next/link";
import { useRouter } from "next/router";
import { MessageCircle, Newspaper, Compass, Smile } from "lucide-react";
import { auth } from "../lib/firebase";

function TabButton({ Icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, minHeight: 56, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 3, background: "none", border: "none", cursor: "pointer",
      color: active ? "var(--accent)" : "var(--text-dim)", position: "relative", padding: "6px 0",
    }}>
      <Icon size={22} strokeWidth={active ? 2.4 : 2} />
      <span style={{ fontSize: 12, fontWeight: active ? 700 : 500 }}>{label}</span>
      {badge > 0 && (
        <span style={{
          position: "absolute", top: 3, right: "calc(50% - 20px)", background: "#ef4444", color: "#fff",
          fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 8, display: "flex",
          alignItems: "center", justifyContent: "center", padding: "0 3px",
        }}>{badge}</span>
      )}
    </button>
  );
}

// activeTab/onSelectChats/onSelectMore/onOpenProfile are all optional: when this bar
// is docked inside ChatRoom, ChatRoom passes explicit callbacks that just flip local
// SPA state. When it's mounted standalone (via MobileTabBarLayout, on pages like
// /feed or /profile/[uid] that live outside ChatRoom entirely), none of those callbacks
// exist — the router-based fallbacks below take over so the bar is still fully usable.
export default function ChatMobileTabBar({ activeTab, onSelectChats, onSelectMore, onOpenProfile, pendingCount = 0 }) {
  const router = useRouter();
  const goChats = onSelectChats || (() => router.push('/?view=list'));
  const goMore = onSelectMore || (() => router.push('/?view=more'));
  const goProfile = onOpenProfile || (() => router.push(`/profile/${auth.currentUser?.uid || ''}`));

  return (
    <div className="cr-tabbar">
      <style>{`
        .cr-tabbar { display: none; }
        @media (max-width: 767px) {
          .cr-tabbar {
            display: flex !important;
            flex-shrink: 0;
            border-top: 1px solid var(--border);
            background: var(--panel);
            padding-bottom: env(safe-area-inset-bottom);
          }
        }
      `}</style>
      <TabButton Icon={MessageCircle} label="聊天" active={activeTab === 'chat'} onClick={goChats} badge={pendingCount} />
      <Link href="/feed" style={{
        flex: 1, minHeight: 56, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 3, textDecoration: "none",
        color: activeTab === 'feed' ? "var(--accent)" : "var(--text-dim)", padding: "6px 0",
      }}>
        <Newspaper size={22} strokeWidth={activeTab === 'feed' ? 2.4 : 2} />
        <span style={{ fontSize: 12, fontWeight: activeTab === 'feed' ? 700 : 500 }}>動態消息</span>
      </Link>
      <TabButton Icon={Compass} label="更多" active={activeTab === 'more'} onClick={goMore} />
      <TabButton Icon={Smile} label="我" active={activeTab === 'me'} onClick={goProfile} />
    </div>
  );
}
