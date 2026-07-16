import Link from "next/link";

function TabButton({ icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, minHeight: 48, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 2, background: "none", border: "none", cursor: "pointer",
      color: active ? "var(--accent)" : "var(--text-faint)", position: "relative", padding: "6px 0",
    }}>
      <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{label}</span>
      {badge > 0 && (
        <span style={{
          position: "absolute", top: 2, right: "calc(50% - 22px)", background: "#ef4444", color: "#fff",
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
      <TabButton icon="💬" label="聊天" active={activeTab === 'chat'} onClick={onSelectChats} badge={pendingCount} />
      <Link href="/feed" style={{
        flex: 1, minHeight: 48, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 2, textDecoration: "none", color: "var(--text-faint)", padding: "6px 0",
      }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>📰</span>
        <span style={{ fontSize: 10 }}>動態消息</span>
      </Link>
      <TabButton icon="🧭" label="更多" active={activeTab === 'more'} onClick={onSelectMore} />
      <TabButton icon="🙂" label="我" active={false} onClick={onOpenProfile} />
    </div>
  );
}
