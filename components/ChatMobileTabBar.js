import Link from "next/link";
import { MessageCircle, Newspaper, Compass, Smile } from "lucide-react";

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

export default function ChatMobileTabBar({ activeTab, onSelectChats, onSelectMore, onOpenProfile, pendingCount = 0 }) {
  return (
    <div className="cr-tabbar">
      <TabButton Icon={MessageCircle} label="聊天" active={activeTab === 'chat'} onClick={onSelectChats} badge={pendingCount} />
      <Link href="/feed" style={{
        flex: 1, minHeight: 56, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 3, textDecoration: "none", color: "var(--text-dim)", padding: "6px 0",
      }}>
        <Newspaper size={22} strokeWidth={2} />
        <span style={{ fontSize: 12, fontWeight: 500 }}>動態消息</span>
      </Link>
      <TabButton Icon={Compass} label="更多" active={activeTab === 'more'} onClick={onSelectMore} />
      <TabButton Icon={Smile} label="我" active={false} onClick={onOpenProfile} />
    </div>
  );
}
