import { Search, MessageCircle, Plus } from "lucide-react";
import { getStatus, AvatarImg, UnreadBadge, isGroupAvatarImage } from "./ChatRoom";

// 手機版「首頁」分頁的預設內容：群組＋好友清單（＋置頂的 # 公共大廳 入口），
// 點群組/好友進去看對話，點公共大廳切到大廳對話畫面。
//
// 這份 JSX 原本直接寫在 ChatRoom.js 的 isMobile 分支裡（舊的 4015-4131 行），
// 這次原封不動搬出來，目的是「物理隔離」：之後要改手機版首頁清單時，實體上
// 不會再開到桌面版共用的那個檔案。搬移過程沒有改動任何行為、樣式或邏輯，
// 只是把原本讀 ChatRoom 作用域的識別字改成從 props 進來。
//
// ChatRoom.js 用 dynamic() 載入這個檔案（比照 AiChatRoom/OfficeMode 的既有
// 寫法），所以：
//   (a) 桌面版使用者不會下載這包
//   (b) ChatRoom.js 沒有對本檔的靜態 import，所以下面那行反向 import
//       （getStatus 等 4 個 helper）不會形成模組載入期的循環相依
//
// getStatus／AvatarImg／UnreadBadge／isGroupAvatarImage 這 4 個是桌機手機共用
// 的純函式，仍然定義在 ChatRoom.js 最外層（只加了 export 關鍵字，定義位置和
// 45 處既有呼叫點都沒動），要改它們的外觀還是得回 ChatRoom.js 改，而那會同時
// 影響桌面版——這是已知且刻意保留的現狀。
//
// 已知的跨檔案耦合（本次刻意不處理）：下面好友列的長按會呼叫 setContextMenu，
// 但那個選單本身仍然渲染在 ChatRoom.js（桌面版右鍵用的是同一個），觸發在這裡、
// 顯示在那裡。
export default function MobileHomeList({
  pendingInCount,
  searchQuery,
  setSearchQuery,
  myGroups,
  myFriends,
  activeGroupId,
  activeFriendId,
  uid,
  privateUnread,
  setShowFriendReqs,
  setShowFriendSearch,
  setShowCreateGroup,
  setActiveGroupId,
  setActiveFriendId,
  setContextMenu,
  setMobileHomeSubview,
  resetAllViews,
  longPressFiredRef,
  longPressTimerRef,
}) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
      {pendingInCount > 0 && (
        <button onClick={() => setShowFriendReqs(true)}
          style={{ margin: "12px 16px 0", display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#dc2626,#b91c1c)", border: "none", borderRadius: 14, padding: "10px 12px", color: "#fff", cursor: "pointer", width: "calc(100% - 32px)", textAlign: "left" }}>
          <span style={{ fontSize: 18 }}>🔔</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>你有 {pendingInCount} 個好友請求</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>點擊查看並處理</div>
          </div>
        </button>
      )}

      <div style={{ padding: "12px 16px 8px" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Search size={16} style={{ position: "absolute", left: 14, color: "var(--text-dim)", pointerEvents: "none" }} />
          <input type="text" placeholder="搜尋好友..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={{ width: "100%", height: 44, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, padding: "0 14px 0 38px", color: "var(--text)", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
        </div>
      </div>

      <div style={{ padding: "4px 16px 0" }}>
        <button onClick={() => { resetAllViews(); setMobileHomeSubview('hall'); }}
          style={{ width: "100%", minHeight: 64, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderRadius: 14, border: "none", background: "transparent", color: "var(--text)", cursor: "pointer", textAlign: "left" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,var(--accent-2),#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <MessageCircle size={22} color="#fff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}># 公共大廳</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>和大家聊天吧</div>
          </div>
        </button>
      </div>

      <div className="cr-nav-hdr">
        <span className="cr-nav-hdr-label">群組 {myGroups.length}</span>
        <button onClick={() => setShowCreateGroup(true)} title="建立群組" className="cr-nav-icon-btn">
          <Plus size={16} />
        </button>
      </div>
      <div style={{ padding: "0 16px 4px" }}>
        {myGroups.map(group => {
          const isActive = activeGroupId === group.id;
          return (
            <button key={group.id} onClick={() => { resetAllViews(); setActiveGroupId(group.id); }}
              className={`fb ${isActive ? "act" : ""}`}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div className="cr-fb-icon">
                  {isGroupAvatarImage(group.avatar)
                    ? <img src={group.avatar} alt={group.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit", display: "block" }} />
                    : (group.avatar || (group.name ? group.name.slice(0, 1).toUpperCase() : "👥"))}
                </div>
                <UnreadBadge count={group.unreadCount?.[uid]} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cr-fb-name">{group.name}</div>
                <div className="cr-fb-sub">{(group.members || []).length} 人</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="cr-nav-hdr">
        <span className="cr-nav-hdr-label">好友 {myFriends.length}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {pendingInCount > 0 && (
            <button onClick={() => setShowFriendReqs(true)} title="好友請求" style={{ background: "#ef4444", border: "none", borderRadius: 20, padding: "2px 8px", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              🔔 {pendingInCount}
            </button>
          )}
          <button onClick={() => setShowFriendSearch(true)} title="加好友" className="cr-nav-icon-btn">
            <Plus size={16} />
          </button>
        </div>
      </div>
      <div style={{ padding: "0 16px 8px" }}>
        {myFriends.length === 0 && !searchQuery && (
          <div style={{ textAlign: "center", padding: "20px 12px", color: "var(--text-dim)", fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
            還沒有好友<br />
            <button onClick={() => setShowFriendSearch(true)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 13, marginTop: 6 }}>點擊搜尋好友</button>
          </div>
        )}
        {myFriends.map(friend => {
          const isActive = activeFriendId === friend.uid;
          return (
            <button key={friend.uid} onClick={() => { if (longPressFiredRef.current) { longPressFiredRef.current = false; return; } resetAllViews(); setActiveFriendId(friend.uid); }}
              onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, friend }); }}
              onTouchStart={e => {
                longPressFiredRef.current = false;
                const touch = e.touches[0];
                const x = touch.clientX, y = touch.clientY;
                longPressTimerRef.current = setTimeout(() => {
                  longPressFiredRef.current = true;
                  setContextMenu({ x, y, friend });
                }, 500);
              }}
              onTouchEnd={() => clearTimeout(longPressTimerRef.current)}
              onTouchMove={() => clearTimeout(longPressTimerRef.current)}
              className={`fb ${isActive ? "act" : ""}`}
              style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <AvatarImg avatarImage={friend.avatarImage} avatar={friend.avatar} color={friend.color} size={48} />
                <span style={{ position: "absolute", bottom: 1, right: 1, width: 12, height: 12, borderRadius: "50%", background: getStatus(friend.status).color, border: "2px solid var(--panel-alt)" }} />
                <UnreadBadge count={privateUnread[friend.uid]} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cr-fb-name">{friend.nickname}</div>
                <div className="cr-fb-sub">
                  {friend.statusText || getStatus(friend.status).label}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
