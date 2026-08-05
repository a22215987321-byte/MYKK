import Link from "next/link";
import { useRouter } from "next/router";
import { Home, Newspaper, Video, Smile } from "lucide-react";
import { auth } from "../lib/firebase";

function TabButton({ Icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, minHeight: 56, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 2, background: "none", border: "none", cursor: "pointer",
      color: active ? "var(--accent)" : "var(--text-dim)", position: "relative", padding: "6px 0",
    }}>
      <Icon size={20} strokeWidth={active ? 2.4 : 2} />
      <span style={{ fontSize: 11, fontWeight: active ? 700 : 500 }}>{label}</span>
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

// 4 個底部按鈕：首頁（群組＋好友清單，點進去看對話）／動態消息／影片／我。
// 圖片編輯、原本的「更多」分頁都不在底部了——「更多」（其他功能方塊：
// AI助手、字典、語言學習工具等，圖片編輯也在裡面）現在改成從聊天畫面
// 向右滑喚出（見 ChatRoom.js 的 cr-sidebar 手機版內容 + handleShellPointer*
// 那組拖曳手勢），不用佔一個底部按鈕位置。
//
// activeTab/onSelectHome/onSelectVideo/onOpenProfile 都是選填：這個列表被
// ChatRoom 內嵌使用時，ChatRoom 會傳明確的 callback 直接切換內部 state；
// 被 MobileTabBarLayout 獨立掛載時（例如 /feed、/profile/[uid] 這些活在
// ChatRoom 外面的頁面），沒有這些 callback，就退回用路由的 fallback。
export default function ChatMobileTabBar({ activeTab, onSelectHome, onSelectVideo, onOpenProfile, pendingCount = 0 }) {
  const router = useRouter();
  const goHome = onSelectHome || (() => router.push('/?view=list'));
  const goVideo = onSelectVideo || (() => router.push('/?view=video'));
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
      <TabButton Icon={Home} label="首頁" active={activeTab === 'home'} onClick={goHome} badge={pendingCount} />
      <Link href="/feed" style={{
        flex: 1, minHeight: 56, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 2, textDecoration: "none",
        color: activeTab === 'feed' ? "var(--accent)" : "var(--text-dim)", padding: "6px 0",
      }}>
        <Newspaper size={20} strokeWidth={activeTab === 'feed' ? 2.4 : 2} />
        <span style={{ fontSize: 11, fontWeight: activeTab === 'feed' ? 700 : 500 }}>動態消息</span>
      </Link>
      <TabButton Icon={Video} label="影片" active={activeTab === 'video'} onClick={goVideo} />
      <TabButton Icon={Smile} label="我" active={activeTab === 'me'} onClick={goProfile} />
    </div>
  );
}
