import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { auth, db } from "../lib/firebase";
import { uploadToR2 } from "../lib/uploadToR2";
import { toast } from "../lib/toast";
import { playNotificationSound } from "../lib/notificationSound";
import AvatarCreator from "./AvatarCreator";
import CalendarMemo from "./CalendarMemo";
import PageNotes from "./PageNotes";
import ThemeToggle from "./ThemeToggle";
import NavItem from "./nav/NavItem";
import ChatMoreMenu from "./ChatMoreMenu";
import ChatMobileTabBar from "./ChatMobileTabBar";
import VocabRoom from "./VocabRoom";
import SpanishRoom from "./SpanishRoom";
import SpanishCourseRoom from "./SpanishCourseRoom";
import CustomVocabRoom from "./CustomVocabRoom";
import DictionaryRoom from "./DictionaryRoom";
import FeedApp from "./Feed";
import ProfileView from "./ProfileView";
import VideoHub from "./VideoHub";
import ChannelProfileView from "./ChannelProfileView";
import GroupInfoView from "./GroupInfoView";
import {
  bumpPrivateChatSummary as bumpPrivateChatSummaryLib,
  bumpGroupChatSummary as bumpGroupChatSummaryLib,
} from "../lib/chatSummary";
import SpanishPronunciation from "./SpanishPronunciation";
import SpanishGrammar from "./SpanishGrammar";
import SpanishVerbConjugator from "./SpanishVerbConjugator";
import EnglishPronunciation from "./EnglishPronunciation";
import IeltsBand4 from "./IeltsBand4";
import ImageEditorRoom from "./ImageEditorRoom";
import AiChatRoom from "./AiChatRoom";
import { DocConvertRoomLazy } from "./doc-convert";
import AiCompanionRoom from "./AiCompanionRoom";
import AiCompanionCreator from "./AiCompanionCreator";
import UpgradeMembership, { UpgradeHighlights } from "./UpgradeMembership";
import EmojiStickerPicker from "./EmojiStickerPicker";
import LoadingState from "./LoadingState";
import useIsMobile from "../lib/useIsMobile";
import { QUICK_REACTIONS, STICKER_SRC_BY_ID } from "../data/chat/gesturePacks";
import { ChevronLeft, ChevronRight, CalendarDays, Settings, LogOut, Plus, Search, Newspaper, MessageCircle } from "lucide-react";
import {
  doc, collection, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, limitToLast, serverTimestamp,
  arrayUnion, arrayRemove, getDocs, where, limit, getDoc, increment,
} from "firebase/firestore";

const EMOJI_QUICK  = QUICK_REACTIONS;
const PROFILE_GRADIENTS = [
  "linear-gradient(135deg,#1e3a5f,#2d1f6e)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#06b6d4,#3b82f6)",
  "linear-gradient(135deg,#10b981,#059669)",
  "linear-gradient(135deg,#ec4899,#8b5cf6)",
  "linear-gradient(135deg,#0f172a,#1e293b)",
  "linear-gradient(135deg,#f472b6,#fb923c)",
  "linear-gradient(135deg,#34d399,#06b6d4)",
  "radial-gradient(ellipse at 20% 15%, rgba(96,84,210,0.65), transparent 55%), radial-gradient(ellipse at 85% 88%, rgba(36,140,170,0.55), transparent 55%) #0a0e1a",
  "radial-gradient(ellipse at 80% 10%, rgba(236,72,153,0.55), transparent 50%), radial-gradient(ellipse at 15% 90%, rgba(99,102,241,0.50), transparent 55%) #0f0a1e",
  "radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.45), transparent 50%), radial-gradient(ellipse at 20% 80%, rgba(239,68,68,0.40), transparent 55%) #150a00",
  "radial-gradient(ellipse at 10% 50%, rgba(16,185,129,0.50), transparent 55%), radial-gradient(ellipse at 90% 50%, rgba(6,182,212,0.45), transparent 55%) #001a14",
];
const STATUS_EMOJIS = ["🎵","💻","📖","🏃","🎮","😴","🍕","☕"];
const AVATAR_EMOJIS = ["😊","👨‍💻","📚","🏃","🎮","🎨","🍜","🌸","🦊","🐼","🎧","⚡"];
const COLORS = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#ef4444","#06b6d4","#84cc16"];

function formatTime(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function toMillis(ts) {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}

function getStatus(status) {
  switch (status) {
    case "online": return { label: "線上",    color: "#22c55e" };
    case "away":   return { label: "離開", color: "#eab308" };
    case "dnd":    return { label: "勿擾", color: "#ef4444" };
    default:       return { label: "離線",    color: "#6b7280" };
  }
}

// 表情貼圖插入文字時用的代碼（見 EmojiStickerPicker 的 handlePick），
// 這裡在渲染訊息文字時把代碼換回圖片：整則訊息只有一個代碼＝貼圖大小獨立顯示，
// 代碼混在其他文字中間＝縮成跟文字同高的小圖，行為隨代碼在訊息裡的位置決定。
const STICKER_TOKEN_RE = /\[\[sticker:([\w-]+)\]\]/g;

function isSoloStickerToken(text) {
  if (!text) return false;
  const matches = [...text.matchAll(STICKER_TOKEN_RE)];
  return matches.length === 1 && text.trim() === matches[0][0];
}

function renderMessageText(text) {
  if (!text) return text;
  const matches = [...text.matchAll(STICKER_TOKEN_RE)];
  if (matches.length === 0) return text;

  if (isSoloStickerToken(text)) {
    const src = STICKER_SRC_BY_ID[matches[0][1]];
    return src
      ? <img src={src} alt="" style={{ width: 120, height: 120, objectFit: "contain", display: "block" }} />
      : text;
  }

  const parts = [];
  let last = 0;
  matches.forEach((m, i) => {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const src = STICKER_SRC_BY_ID[m[1]];
    parts.push(src
      ? <img key={i} src={src} alt="" style={{ height: "1.5em", width: "1.5em", objectFit: "contain", verticalAlign: "middle", margin: "0 1px" }} />
      : m[0]);
    last = m.index + m[0].length;
  });
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// Avatar helper

function AvatarImg({ avatarImage, avatar, color, size = 36 }) {
  if (avatarImage) {
    return <img src={avatarImage} alt="頭像" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, display: "block" }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.5, flexShrink: 0 }}>
      {avatar || "😊"}
    </div>
  );
}

// 側欄功能方塊「按住 0.5 秒拖曳調整順序」：按住超過 0.5 秒後方塊會整個浮起來
// 跟著滑鼠自由移動（不侷限在原本那條直線上），拖曳中的方塊只要中心點掃過另一個
// 方塊，就會跟那個方塊互換位置（即時生效）；放開滑鼠後浮起的方塊本身消失，回到
// 正常排版裡（也就是這次拖曳過程中換到的最終位置），不會維持浮在原地。
// defaultOrder 之外/之內多出來或少掉的 key 都會自動補齊/濾掉，避免以後增刪
// 功能時，存在 localStorage 的順序資料變成無效值。
function useReorder(storageKey, defaultOrder) {
  const [order, setOrder] = useState(defaultOrder);
  // dragState 非 null 時代表目前正在拖曳中：{ key, x, y, w, h }（x/y 是浮起的
  // 方塊左上角在畫面上的位置，跟著滑鼠即時更新）。
  const [dragState, setDragState] = useState(null);
  const itemRefs = useRef(new Map());
  const justDraggedRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!Array.isArray(saved)) return;
      const cleaned = saved.filter(k => defaultOrder.includes(k));
      const missing = defaultOrder.filter(k => !cleaned.includes(k));
      setOrder([...cleaned, ...missing]);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const registerRef = useCallback((key) => (el) => {
    if (el) itemRefs.current.set(key, el);
    else itemRefs.current.delete(key);
  }, []);

  const startDrag = useCallback((key) => (e) => {
    if (e.button !== 0) return;
    e.stopPropagation(); // 不讓 mousedown 冒泡到外層元素
    let armed = false, moved = false;
    let swapTarget = key;
    const timer = setTimeout(() => {
      const el = itemRefs.current.get(key);
      if (!el) return;
      armed = true;
      const rect = el.getBoundingClientRect();
      setDragState({ key, x: rect.left, y: rect.top, w: rect.width, h: rect.height, grabX: e.clientX - rect.left, grabY: e.clientY - rect.top });
    }, 500);
    const onMove = (ev) => {
      if (!armed) return;
      moved = true;
      ev.preventDefault();
      setDragState(prev => prev ? { ...prev, x: ev.clientX - prev.grabX, y: ev.clientY - prev.grabY } : prev);
      // 拖曳中的方塊「中心點」掃過哪個方塊，就跟那個方塊互換——用中心點而不是
      // 滑鼠原始座標，這樣浮起的方塊視覺上真的疊到哪裡，判定就是那裡。
      const cx = ev.clientX, cy = ev.clientY;
      for (const [k, el] of itemRefs.current) {
        if (k === key) continue;
        const r = el.getBoundingClientRect();
        if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
          if (swapTarget !== k) {
            swapTarget = k;
            setOrder(prev => {
              const a = prev.indexOf(key), b = prev.indexOf(k);
              if (a < 0 || b < 0) return prev;
              const next = prev.slice();
              [next[a], next[b]] = [next[b], next[a]];
              return next;
            });
          }
          break;
        }
      }
    };
    const onUp = () => {
      clearTimeout(timer);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setDragState(null);
      if (armed && moved) {
        justDraggedRef.current = key;
        setOrder(cur => {
          try { localStorage.setItem(storageKey, JSON.stringify(cur)); } catch {}
          return cur;
        });
      }
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [storageKey]);

  const wasJustDragged = useCallback((key) => {
    if (justDraggedRef.current === key) { justDraggedRef.current = null; return true; }
    return false;
  }, []);

  return { order, dragState, startDrag, wasJustDragged, registerRef };
}

// 包住每個可拖曳項目：onMouseDown 開始長按計時、onClickCapture 在剛拖曳完
// 之後把緊接著那次 click 吃掉，不會一放開就誤觸該項目原本的 onClick（切換頁面）。
// 拖曳中（dragState.key === 這一個）時原地那份直接隱藏，改由外層另外渲染一份
// 浮起來跟著滑鼠跑的版本（見下面 DragGhost）。
function DragReorderWrap({ dragKey, controller, style, children }) {
  const { dragState, startDrag, wasJustDragged, registerRef } = controller;
  const isDragging = dragState?.key === dragKey;
  return (
    <div
      ref={registerRef(dragKey)}
      onMouseDown={startDrag(dragKey)}
      onClickCapture={e => { if (wasJustDragged(dragKey)) { e.stopPropagation(); e.preventDefault(); } }}
      style={{ ...style, visibility: isDragging ? "hidden" : "visible", cursor: "grab" }}>
      {children}
    </div>
  );
}

// 拖曳中浮在最上層、跟著滑鼠跑的那份方塊複本，position:fixed 所以不受側欄
// scroll/排版影響，pointerEvents:none 避免擋到底下的 hit-test。
function DragGhost({ controller, children }) {
  const { dragState } = controller;
  if (!dragState) return null;
  return (
    <div style={{
      position: "fixed", left: dragState.x, top: dragState.y,
      width: dragState.w, height: dragState.h, zIndex: 1000,
      pointerEvents: "none", opacity: 0.92, transform: "scale(1.02)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.45)", borderRadius: "var(--radius-md)", overflow: "hidden",
    }}>
      {children}
    </div>
  );
}

// 側欄「資料夾」系統：跟 useReorder 一樣的按住 0.5 秒才觸發拖曳、放開回到
// 原位／碰到目標才交換的手感，多加一層「容器」概念——layout 是最上層清單
// （項目 key 或 "folder:<id>"），folders 另外存每個資料夾自己的名字／展開狀態／
// 裡面的項目清單。同容器內拖曳＝即時交換位置（跟原本一樣），跨容器（拖進/拖出
// 資料夾）則是放開滑鼠當下才真正搬過去，過程中只用 dropTarget 高亮顯示目標。
function useSidebarLayout(storageKey, legacyKey, defaultOrder) {
  const [layout, setLayout] = useState(defaultOrder);
  const [folders, setFolders] = useState({});
  const [dragState, setDragState] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const topRefs = useRef(new Map());
  const childRefs = useRef(new Map());
  const justDraggedRef = useRef(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && Array.isArray(saved.layout) && saved.folders && typeof saved.folders === "object") {
          const folderIds = new Set(Object.keys(saved.folders).map(id => `folder:${id}`));
          const validLayout = saved.layout.filter(k => defaultOrder.includes(k) || folderIds.has(k));
          const placed = new Set([
            ...validLayout.filter(k => !k.startsWith("folder:")),
            ...Object.values(saved.folders).flatMap(f => Array.isArray(f.items) ? f.items.filter(k => defaultOrder.includes(k)) : []),
          ]);
          const missing = defaultOrder.filter(k => !placed.has(k));
          const cleanedFolders = {};
          for (const [fid, f] of Object.entries(saved.folders)) {
            cleanedFolders[fid] = { name: f.name || "資料夾", open: !!f.open, items: Array.isArray(f.items) ? f.items.filter(k => defaultOrder.includes(k)) : [] };
          }
          setLayout([...validLayout, ...missing]);
          setFolders(cleanedFolders);
          loadedRef.current = true;
          return;
        }
      }
      if (legacyKey) {
        const rawLegacy = localStorage.getItem(legacyKey);
        if (rawLegacy) {
          const savedLegacy = JSON.parse(rawLegacy);
          if (Array.isArray(savedLegacy)) {
            const cleaned = savedLegacy.filter(k => defaultOrder.includes(k));
            const missing = defaultOrder.filter(k => !cleaned.includes(k));
            setLayout([...cleaned, ...missing]);
          }
        }
      }
    } catch {}
    loadedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!loadedRef.current) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ layout, folders })); } catch {}
  }, [storageKey, layout, folders]);

  const registerTop = useCallback((key) => (el) => {
    if (el) topRefs.current.set(key, el); else topRefs.current.delete(key);
  }, []);
  const registerChild = useCallback((fid, key) => (el) => {
    if (el) childRefs.current.set(key, { fid, el }); else childRefs.current.delete(key);
  }, []);

  const startDrag = useCallback((dragKey, sourceContainer) => (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    let armed = false, moved = false;
    let currentDrop = null;
    const setDrop = (v) => { currentDrop = v; setDropTarget(v); };
    const timer = setTimeout(() => {
      const el = sourceContainer === "top" ? topRefs.current.get(dragKey) : childRefs.current.get(dragKey)?.el;
      if (!el) return;
      armed = true;
      const rect = el.getBoundingClientRect();
      setDragState({ key: dragKey, sourceContainer, x: rect.left, y: rect.top, w: rect.width, h: rect.height, grabX: e.clientX - rect.left, grabY: e.clientY - rect.top });
    }, 500);

    const findHit = (map, cx, cy) => {
      for (const [k, v] of map) {
        if (k === dragKey) continue;
        const el = v.el || v;
        const r = el.getBoundingClientRect();
        if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) return { key: k, fid: v.fid };
      }
      return null;
    };

    const onMove = (ev) => {
      if (!armed) return;
      moved = true;
      ev.preventDefault();
      setDragState(prev => prev ? { ...prev, x: ev.clientX - prev.grabX, y: ev.clientY - prev.grabY } : prev);
      const cx = ev.clientX, cy = ev.clientY;

      if (sourceContainer !== "top") {
        const hitChild = findHit(childRefs.current, cx, cy);
        if (hitChild && hitChild.fid === sourceContainer) {
          setDrop(null);
          setFolders(prev => {
            const items = prev[sourceContainer]?.items || [];
            const a = items.indexOf(dragKey), b = items.indexOf(hitChild.key);
            if (a < 0 || b < 0 || a === b) return prev;
            const next = items.slice();
            [next[a], next[b]] = [next[b], next[a]];
            return { ...prev, [sourceContainer]: { ...prev[sourceContainer], items: next } };
          });
          return;
        }
      }

      const hitTop = findHit(topRefs.current, cx, cy);
      if (hitTop) {
        if (hitTop.key.startsWith("folder:")) {
          const fid = hitTop.key.slice(7);
          if (sourceContainer === "top" && dragKey.startsWith("folder:")) {
            setDrop(null);
            setLayout(prev => {
              const a = prev.indexOf(dragKey), b = prev.indexOf(hitTop.key);
              if (a < 0 || b < 0 || a === b) return prev;
              const next = prev.slice();
              [next[a], next[b]] = [next[b], next[a]];
              return next;
            });
          } else if (fid === sourceContainer) {
            setDrop(null);
          } else {
            setDrop({ folderId: fid });
          }
        } else {
          if (sourceContainer === "top") {
            setDrop(null);
            setLayout(prev => {
              const a = prev.indexOf(dragKey), b = prev.indexOf(hitTop.key);
              if (a < 0 || b < 0 || a === b) return prev;
              const next = prev.slice();
              [next[a], next[b]] = [next[b], next[a]];
              return next;
            });
          } else {
            setDrop({ top: true });
          }
        }
      } else {
        setDrop(null);
      }
    };

    const onUp = () => {
      clearTimeout(timer);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setDragState(null);
      setDropTarget(null);
      if (armed && moved) {
        justDraggedRef.current = dragKey;
        if (sourceContainer === "top") {
          if (currentDrop?.folderId) {
            const fid = currentDrop.folderId;
            setLayout(l => l.filter(k => k !== dragKey));
            setFolders(f => ({ ...f, [fid]: { ...f[fid], items: [...(f[fid]?.items || []), dragKey] } }));
          }
        } else {
          if (currentDrop?.folderId && currentDrop.folderId !== sourceContainer) {
            const fid = currentDrop.folderId;
            setFolders(f => ({
              ...f,
              [sourceContainer]: { ...f[sourceContainer], items: (f[sourceContainer]?.items || []).filter(k => k !== dragKey) },
              [fid]: { ...f[fid], items: [...(f[fid]?.items || []), dragKey] },
            }));
          } else if (currentDrop?.top) {
            setFolders(f => ({ ...f, [sourceContainer]: { ...f[sourceContainer], items: (f[sourceContainer]?.items || []).filter(k => k !== dragKey) } }));
            setLayout(l => [...l, dragKey]);
          }
        }
      }
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  const wasJustDragged = useCallback((key) => {
    if (justDraggedRef.current === key) { justDraggedRef.current = null; return true; }
    return false;
  }, []);

  const addFolder = useCallback((name) => {
    const id = `f${Date.now()}`;
    setFolders(f => ({ ...f, [id]: { name, open: true, items: [] } }));
    setLayout(l => [...l, `folder:${id}`]);
  }, []);

  const renameFolder = useCallback((id, name) => {
    setFolders(f => (f[id] ? { ...f, [id]: { ...f[id], name } } : f));
  }, []);

  const toggleFolder = useCallback((id) => {
    setFolders(f => (f[id] ? { ...f, [id]: { ...f[id], open: !f[id].open } } : f));
  }, []);

  const deleteFolder = useCallback((id) => {
    const removed = folders[id];
    if (!removed) return;
    setFolders(f => { const { [id]: _drop, ...rest } = f; return rest; });
    setLayout(l => l.flatMap(k => (k === `folder:${id}` ? removed.items : [k])));
    setActiveFolderId(prev => (prev === id ? null : prev));
  }, [folders]);

  // 資料夾圖示放到最左側那條窄窄的 rail（見 FolderRailIcon）之後，「打開」
  // 資料夾不再是原地展開一整條列表，而是「這個資料夾目前是不是主清單顯示
  // 的對象」——activeFolderId 是 rail 跟主清單共用的同一份狀態。點同一個
  // 資料夾兩次等於收合回「全部功能」清單。
  const [activeFolderId, setActiveFolderId] = useState(null);
  const setActiveFolder = useCallback((id) => {
    setActiveFolderId(prev => (prev === id ? null : id));
  }, []);

  return {
    layout, folders, dragState, dropTarget, startDrag, wasJustDragged, registerTop, registerChild,
    addFolder, renameFolder, toggleFolder, deleteFolder,
    activeFolderId, setActiveFolder,
  };
}

// 包住每個放進資料夾系統的項目／資料夾本身：sourceContainer 是 "top"（最上層）
// 或某個資料夾 id（代表這個項目目前放在該資料夾裡面）。
function LayoutDragWrap({ dragKey, sourceContainer, controller, style, children }) {
  const { dragState, startDrag, wasJustDragged, registerTop, registerChild } = controller;
  const isDragging = dragState?.key === dragKey;
  const ref = sourceContainer === "top" ? registerTop(dragKey) : registerChild(sourceContainer, dragKey);
  return (
    <div
      ref={ref}
      onMouseDown={startDrag(dragKey, sourceContainer)}
      onClickCapture={e => { if (wasJustDragged(dragKey)) { e.stopPropagation(); e.preventDefault(); } }}
      style={{ ...style, visibility: isDragging ? "hidden" : "visible", cursor: "grab" }}>
      {children}
    </div>
  );
}

function LayoutDragGhost({ controller, topItems }) {
  const { dragState, folders } = controller;
  if (!dragState) return null;
  const key = dragState.key;
  let content = null;
  if (key.startsWith("folder:")) {
    const fid = key.slice(7);
    const f = folders[fid];
    if (f) {
      content = (
        <FolderBlock id={fid} name={f.name} open={f.open} count={f.items.length}
          isDropTarget={false} onToggle={() => {}} onRename={() => {}} onDelete={() => {}} />
      );
    }
  } else {
    content = topItems[key];
  }
  return (
    <div style={{
      position: "fixed", left: dragState.x, top: dragState.y,
      width: dragState.w, height: dragState.h, zIndex: 1000,
      pointerEvents: "none", opacity: 0.92, transform: "scale(1.02)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.45)", borderRadius: "var(--radius-md)", overflow: "hidden",
    }}>
      {content}
    </div>
  );
}

// 資料夾圖示——放在側欄最左邊那條窄 rail 裡（跟 Discord 伺服器欄同樣概念），
// 一個資料夾就是一個小圓角方塊圖示 + 底下一行極小的名字，不再是一整條
// 「名字＋副標＋箭頭」的列。active 時角變方（跟 Discord 選中伺服器變成
// squircle 一樣的視覺語言）。isDropTarget 為 true 時外框亮起來提示放這裡。
function FolderRailIcon({ name, count, active, isDropTarget, onClick }) {
  return (
    <button onClick={onClick} title={`${name}（${count} 個功能）`}
      style={{
        width: 44, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0,
      }}>
      <div style={{
        width: 40, height: 40, borderRadius: active ? "30%" : "50%",
        background: active ? "linear-gradient(135deg,var(--accent),var(--accent-2))" : "linear-gradient(135deg,#475569,#1e293b)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, color: "#fff", position: "relative",
        border: isDropTarget ? "2px solid var(--accent)" : "2px solid transparent",
        boxShadow: isDropTarget ? "0 0 0 2px var(--accent-active)" : "none",
        transition: "border-radius 0.15s",
      }}>
        📁
      </div>
      <span style={{ fontSize: 9, color: active ? "var(--text)" : "var(--text-faint)", maxWidth: 44, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {name}
      </span>
    </button>
  );
}

// 新增資料夾：rail 上一個跟資料夾圖示同尺寸的虛線圓形 + 圖案，點下去在旁邊
// 彈出一個小輸入框（rail 太窄，塞不下一整條輸入欄）。
function AddFolderRailButton({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const commit = () => {
    const trimmed = name.trim();
    if (trimmed) onAdd(trimmed);
    setName(""); setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", flexShrink: 0 }}>
      <button onClick={() => setOpen(v => !v)} title="新增資料夾"
        style={{
          width: 40, height: 40, borderRadius: "50%", border: "1px dashed var(--border)",
          background: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 18,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
        ➕
      </button>
      {open && (
        <div style={{ position: "absolute", left: "100%", top: 0, marginLeft: 8, zIndex: 60, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "var(--card-shadow)", padding: 8, width: 170 }}>
          <input
            autoFocus value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setOpen(false); }}
            placeholder="資料夾名稱"
            style={{ width: "100%", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", fontSize: 13, padding: "6px 8px", boxSizing: "border-box", marginBottom: 6 }}
          />
          <button onClick={commit} style={{ width: "100%", background: "var(--accent)", border: "none", borderRadius: 6, color: "var(--accent-text)", padding: "6px 0", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
            新增
          </button>
        </div>
      )}
    </div>
  );
}

// 目前正在看某個資料夾內容時，主清單最上面那一條：返回鍵 + 名字 + 重新命名／刪除。
function ActiveFolderHeader({ folder, onBack, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(folder.name);
  useEffect(() => { setDraft(folder.name); }, [folder.name]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 10px 8px" }}>
      <button onClick={onBack} title="返回全部功能" style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 14, padding: 4, flexShrink: 0 }}>←</button>
      {editing ? (
        <input
          autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") { onRename(draft.trim() || folder.name); setEditing(false); }
            if (e.key === "Escape") { setDraft(folder.name); setEditing(false); }
          }}
          onBlur={() => { onRename(draft.trim() || folder.name); setEditing(false); }}
          style={{ flex: 1, minWidth: 0, background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", fontSize: 12, fontWeight: 700, padding: "3px 6px", boxSizing: "border-box" }}
        />
      ) : (
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          📁 {folder.name}
        </span>
      )}
      {!editing && (
        <>
          <button onClick={() => setEditing(true)} title="重新命名" style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 12, padding: 4, flexShrink: 0 }}>✏️</button>
          <button onClick={onDelete} title="刪除資料夾" style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 12, padding: 4, flexShrink: 0 }}>🗑️</button>
        </>
      )}
    </div>
  );
}

// 側欄好友/群組項目上的未讀角標——0 不顯示，1-99 顯示數字，超過顯示「99+」。
// 疊在頭像/圖示右上角，跟左下角既有的線上狀態小圓點分開，不會互相遮住。
function UnreadBadge({ count }) {
  if (!count) return null;
  return (
    <span style={{
      position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, padding: "0 4px",
      borderRadius: 999, background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
      border: "2px solid var(--panel-alt)", boxSizing: "content-box", pointerEvents: "none",
    }}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

// 群組頭像跟 avatar emoji 共用同一個欄位（預設 "👥"，上傳後變成 R2 圖片網址）——
// 用這個判斷目前存的是要當文字顯示的 emoji，還是要當 <img src> 顯示的圖片網址。
function isGroupAvatarImage(avatar) {
  return typeof avatar === "string" && avatar.startsWith("http");
}

// MessageBubble

function MessageBubble({ msg, isMine, showSender, myUid, collectionPath, msgFontSize = 14, prevCreatedAt }) {
  const [showPicker, setShowPicker] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [tapped, setTapped] = useState(false);
  const [preview, setPreview] = useState(false);
  const showActions = hovered || tapped;
  const longPressRef = useRef(null);

  // 每 5 分鐘才顯示一次發送時間，不是每則訊息底下都印一行——跟上一則訊息
  // （不是跟上一個「有顯示時間」的訊息比，單純比連續兩則）差距達 5 分鐘，
  // 或這是這個聊天室/大廳裡的第一則，才顯示。
  const showTimestamp = (() => {
    const cur = toMillis(msg.createdAt);
    const prev = toMillis(prevCreatedAt);
    if (cur == null || prev == null) return true;
    return cur - prev >= 5 * 60 * 1000;
  })();

  const toggleReaction = async (emoji) => {
    setShowPicker(false);
    if (!collectionPath) return;
    const already = (msg.reactions?.[emoji] || []).includes(myUid);
    try {
      await updateDoc(doc(db, ...collectionPath), {
        [`reactions.${emoji}`]: already ? arrayRemove(myUid) : arrayUnion(myUid),
      });
    } catch (e) {
      console.error("[MessageBubble] toggleReaction failed", { code: e?.code, message: e?.message, emoji, msgId: msg.id });
    }
  };

  const recallMsg = async () => {
    if (!collectionPath) return;
    if (!confirm("確認撤回此訊息？")) return;
    try {
      await updateDoc(doc(db, ...collectionPath), { recalled: true, text: "此訊息已撤回", imageUrl: "", videoUrl: "" });
    } catch (e) {
      toast("撤回失敗，請重試");
    }
  };

  const handleLongPressStart = () => {
    longPressRef.current = setTimeout(() => setShowPicker(true), 500);
  };
  const handleLongPressCancel = () => {
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
  };

  if (msg.recalled) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", marginBottom: 2 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, maxWidth: "72%" }}>
          {!isMine && <div style={{ width: 30, flexShrink: 0 }} />}
          <div style={{ padding: "8px 14px", borderRadius: 18, background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text-dim)", fontSize: 13, fontStyle: "italic" }}>
            此訊息已撤回
          </div>
        </div>
        {showTimestamp && <span style={{ fontSize: 10, color: "var(--border)", marginTop: 2, marginLeft: isMine ? 0 : 40 }}>{formatTime(msg.createdAt)}</span>}
      </div>
    );
  }

  const hasMedia = msg.imageUrl || msg.videoUrl;
  const isEmojiMsg = msg.type === "emoji";
  const isStickerMsg = msg.type === "sticker";
  const isPostShareMsg = msg.type === "post_share" && !!msg.sharedPost;
  // 純文字訊息，但整則內容就是一個 [[sticker:id]] 代碼（表情面板插入的貼圖，
  // 沒有跟其他文字混在一起）——外觀比照 isStickerMsg，跟文字混用時則維持
  // 普通文字泡泡、代碼縮小成行內圖片（見下面 renderMessageText）。
  const soloSticker = !isEmojiMsg && !isStickerMsg && isSoloStickerToken(msg.text);
  const activeReactions = Object.entries(msg.reactions || {}).filter(([, uids]) => uids?.length > 0);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setTapped(v => !v)}
      onTouchStart={handleLongPressStart}
      onTouchEnd={handleLongPressCancel}
      onTouchMove={handleLongPressCancel}
      style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", marginBottom: 2, position: "relative" }}
    >
      {preview && (isStickerMsg || isEmojiMsg) && (
        <div onClick={e => { e.stopPropagation(); setPreview(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          {msg.stickerSrc
            ? <img src={msg.stickerSrc} alt={msg.text} style={{ maxWidth: "80vw", maxHeight: "80vh", objectFit: "contain" }} />
            : <span style={{ fontSize: 160, lineHeight: 1 }}>{msg.text}</span>}
        </div>
      )}
      {showActions && isMine && (
        <div style={{ position: "absolute", top: 0, right: 0, display: "flex", gap: 4, zIndex: 5 }}>
          <button onClick={e => { e.stopPropagation(); recallMsg(); }} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "2px 8px", fontSize: 11, color: "var(--text-muted)", cursor: "pointer", whiteSpace: "nowrap" }}>
            撤回
          </button>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, maxWidth: "72%", marginTop: showActions && isMine ? 22 : 0 }}>
        {!isMine && showSender && (
          <div style={{ flexShrink: 0 }}>
            <AvatarImg avatarImage={msg.senderAvatarImage} avatar={msg.avatar || msg.sender?.[0]} color="var(--accent-2)" size={30} />
          </div>
        )}
        {!isMine && !showSender && <div style={{ width: 30, flexShrink: 0 }} />}
        <div style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
          {!isMine && showSender && <span style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3, marginLeft: 2 }}>{msg.sender}</span>}
          <div onDoubleClick={() => setShowPicker(v => !v)} style={{
            padding: isEmojiMsg || isStickerMsg || isPostShareMsg || soloSticker ? 0 : (hasMedia && !msg.text ? "4px" : "9px 14px"),
            borderRadius: isEmojiMsg ? 0 : (isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px"),
            background: isEmojiMsg || isStickerMsg || isPostShareMsg || soloSticker ? "none" : (isMine ? "linear-gradient(135deg,var(--accent),var(--accent-2))" : "var(--panel)"),
            color: isMine ? "#fff" : "var(--text)", fontSize: msgFontSize, lineHeight: 1.5, cursor: "default",
            border: isEmojiMsg || isStickerMsg || isPostShareMsg || soloSticker ? "none" : (isMine ? "none" : "1px solid var(--border)"),
            backdropFilter: isEmojiMsg || isStickerMsg || isPostShareMsg || soloSticker ? "none" : "var(--panel-blur)", WebkitBackdropFilter: isEmojiMsg || isStickerMsg || isPostShareMsg || soloSticker ? "none" : "var(--panel-blur)",
            overflow: "hidden",
          }}>
            {isEmojiMsg ? (
              <span style={{ fontSize: 42 * (msgFontSize / 14), lineHeight: 1, display: "block" }}>{msg.text}</span>
            ) : isStickerMsg ? (
              <div onClick={e => { e.stopPropagation(); setPreview(true); }} data-sticker-message={msg.stickerId || ""}
                style={{ width: 160, height: 160, maxWidth: 160, maxHeight: 160, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-in" }}>
                {msg.stickerSrc
                  ? <img src={msg.stickerSrc} alt={msg.text} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  : <span style={{ fontSize: 84, lineHeight: 1 }}>{msg.text}</span>}
              </div>
            ) : isPostShareMsg ? (
              <Link href={`/profile/${msg.sharedPost.userId}?post=${msg.sharedPost.id}`} onClick={e => e.stopPropagation()}
                style={{ display: "block", textDecoration: "none", color: "var(--text)", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 10, width: 220, boxShadow: "var(--glow-shadow)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <AvatarImg avatarImage={msg.sharedPost.userAvatarImage} avatar={msg.sharedPost.userAvatar} color={msg.sharedPost.userColor} size={20} />
                  <span style={{ fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.sharedPost.userNickname}</span>
                </div>
                {(msg.sharedPost.imageUrl || msg.sharedPost.videoUrl) && (
                  <div style={{ width: "100%", aspectRatio: "16 / 9", borderRadius: 6, overflow: "hidden", marginBottom: 6, background: "#000" }}>
                    {msg.sharedPost.videoUrl
                      ? <video src={msg.sharedPost.videoUrl} muted style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      : <img src={msg.sharedPost.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                  </div>
                )}
                {msg.sharedPost.text && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {msg.sharedPost.text}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4, fontWeight: 700 }}>查看貼文 ›</div>
              </Link>
            ) : (
              <>
                {msg.videoUrl && (
                  <video src={msg.videoUrl} controls style={{ maxWidth: 260, maxHeight: 200, borderRadius: "var(--radius-md)", display: "block", boxShadow: "var(--glow-shadow)" }} />
                )}
                {msg.imageUrl && (
                  <img src={msg.imageUrl} alt="圖片" style={{ maxWidth: 260, maxHeight: 200, borderRadius: "var(--radius-md)", display: "block", boxShadow: "var(--glow-shadow)" }} />
                )}
                {renderMessageText(msg.text)}
              </>
            )}
          </div>
          {activeReactions.length > 0 && (
            <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
              {activeReactions.map(([emoji, uids]) => (
                <button key={emoji} data-reaction-pill={emoji} onClick={e => { e.stopPropagation(); toggleReaction(emoji); }}
                  style={{
                    background: uids.includes(myUid) ? "var(--accent-active)" : "var(--panel)",
                    border: `1px solid ${uids.includes(myUid) ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 20, padding: "2px 8px", fontSize: 12, color: "var(--text)", cursor: "pointer", display: "flex", alignItems: "center", gap: 3,
                  }}>
                  {emoji} <span style={{ color: "var(--text-faint)" }}>{uids.length}</span>
                </button>
              ))}
            </div>
          )}
          {showPicker && (
            <div onClick={e => e.stopPropagation()} style={{ position: "absolute", [isMine ? "right" : "left"]: 0, bottom: "calc(100% + 6px)", background: "var(--panel)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", padding: "6px 8px", display: "flex", gap: 6, zIndex: 10, boxShadow: "0 6px 20px rgba(0,0,0,0.25)" }}>
              {EMOJI_QUICK.map(e => <button key={e} data-reaction-option={e} onClick={() => toggleReaction(e)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, padding: 4, minWidth: 36, minHeight: 36 }}>{e}</button>)}
            </div>
          )}
        </div>
      </div>
      {showTimestamp && <span style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 3, marginLeft: isMine ? 0 : 40 }}>{formatTime(msg.createdAt)}</span>}
    </div>
  );
}

// ProfilePage

function ProfilePage({ myProfile, friendProfiles, onSave, onClose }) {
  const [nickname,   setNickname]   = useState(myProfile.nickname || "");
  const [bio,        setBio]        = useState(myProfile.bio || "");
  const [avatar,     setAvatar]     = useState(myProfile.avatar || "😊");
  const [color,      setColor]      = useState(myProfile.color || "var(--accent)");
  const [statusText, setStatusText] = useState(myProfile.statusText || "");
  const [status,     setStatus]     = useState(myProfile.status || "online");
  const [signature,  setSignature]  = useState(myProfile.signature || "");
  const [showCreator, setShowCreator] = useState(false);
  const [profileBg,     setProfileBg]     = useState(myProfile.profileBg || "linear-gradient(135deg,var(--accent-hover),#2d1f6e)");
  const [profileBgType, setProfileBgType] = useState(myProfile.profileBgType || "gradient");
  const [bgUploading,   setBgUploading]   = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const bgFileRef = useRef(null);
  const avatarFileRef = useRef(null);
  const friendList = (myProfile.friends || []).map(fid => friendProfiles[fid]).filter(Boolean);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const url = await uploadToR2(file);
      await updateDoc(doc(db, 'users', myProfile.uid), { avatarImage: url });
    } catch {
      toast("頭像上傳失敗，請重試");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600 }}>
      <div className="cr-modal-full" style={{ background: "var(--panel)", borderRadius: 20, width: 460, maxWidth: "92vw", maxHeight: "85vh", overflow: "auto", border: "1px solid var(--border)" }}>
        <div style={{
          background: profileBgType === "gradient" ? profileBg : undefined,
          backgroundImage: profileBgType === "image" ? `url(${profileBg})` : undefined,
          backgroundSize: profileBgType === "image" ? "cover" : undefined,
          backgroundPosition: profileBgType === "image" ? "center" : undefined,
          padding: "28px 28px 0", borderRadius: "20px 20px 0 0", position: "relative",
        }}>
          <button onClick={onClose} className="cr-close-btn" style={{ position: "absolute", top: 14, right: 14, background: "rgba(0,0,0,0.3)", border: "none", borderRadius: "50%", width: 32, height: 32, color: "var(--text-muted)", cursor: "pointer", fontSize: 18 }}>✕</button>
          {showCreator && <AvatarCreator myProfile={myProfile} onClose={() => setShowCreator(false)} />}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
            <div style={{ position: "relative" }}>
              <AvatarImg avatarImage={myProfile.avatarImage} avatar={avatar} color={color} size={80} />
              <span style={{ position: "absolute", bottom: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: getStatus(status).color, border: "3px solid var(--panel)" }} />
              <button onClick={() => setShowCreator(true)} title="更換頭像"
                style={{ position: "absolute", top: 0, left: 0, width: 80, height: 80, borderRadius: "50%", background: "rgba(0,0,0,0)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = "rgba(0,0,0,0.45)"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = 0; e.currentTarget.style.background = "rgba(0,0,0,0)"; }}>
                <span style={{ fontSize: 22, pointerEvents: "none" }}>📷</span>
              </button>
            </div>
            <div style={{ paddingBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 20, color: "var(--text)" }}>{nickname}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: "min(60vw, 260px)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{myProfile.email}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14, paddingBottom: 14 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: "var(--text)" }}>{friendList.length}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>好友</div>
            </div>
          </div>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8, display: "block" }}>頭像圖片</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AvatarImg avatarImage={myProfile.avatarImage} avatar={avatar} color={color} size={48} />
              <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                <button onClick={() => avatarFileRef.current?.click()} disabled={avatarUploading}
                  style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "7px 14px", color: "var(--text-muted)", cursor: avatarUploading ? "default" : "pointer", fontSize: 13 }}>
                  {avatarUploading ? "上傳中..." : "📷 上傳頭像圖片"}
                </button>
                {myProfile.avatarImage && (
                  <button onClick={() => updateDoc(doc(db, 'users', myProfile.uid), { avatarImage: "" })}
                    style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 12, textAlign: "left" }}>移除圖片</button>
                )}
              </div>
              <input ref={avatarFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} />
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 6, display: "block" }}>頭像 Emoji（可選）</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {AVATAR_EMOJIS.map(e => (
                <button key={e} onClick={() => setAvatar(e)} style={{ width: 36, height: 36, borderRadius: "50%", border: avatar === e ? "2px solid var(--accent)" : "2px solid var(--border)", background: color, cursor: "pointer", fontSize: 18 }}>{e}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 6, display: "block" }}>頭像顏色</label>
            <div style={{ display: "flex", gap: 8 }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: color === c ? "3px solid #fff" : "3px solid transparent", cursor: "pointer" }} />
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 4, display: "block" }}>暱稱</label>
            <input value={nickname} onChange={e => setNickname(e.target.value)} style={{ width: "100%", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 4, display: "block" }}>個性簽名（最多 20 字）</label>
            <input value={signature} onChange={e => setSignature(e.target.value.slice(0, 20))} placeholder="寫一句代表你的話..."
              style={{ width: "100%", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            <div style={{ textAlign: "right", fontSize: 11, color: "var(--text-dim)", marginTop: 3 }}>{signature.length} / 20</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 4, display: "block" }}>自我介紹</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="簡單介紹一下自己..." style={{ width: "100%", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "none" }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 4, display: "block" }}>狀態文字</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              {STATUS_EMOJIS.map(e => <button key={e} onClick={() => setStatusText(p => p + e)} style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "4px 8px", cursor: "pointer", fontSize: 16 }}>{e}</button>)}
            </div>
            <input value={statusText} onChange={e => setStatusText(e.target.value)} placeholder="在忙什麼呢..." style={{ width: "100%", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 4, display: "block" }}>上線狀態</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[["online","線上"],["away","離開"],["dnd","勿擾"],["offline","離線"]].map(([s,l]) => (
                <button key={s} onClick={() => setStatus(s)} style={{ flex: 1, padding: "8px 0", border: status === s ? `2px solid ${getStatus(s).color}` : "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: status === s ? `${getStatus(s).color}22` : "var(--panel-alt)", color: status === s ? getStatus(s).color : "var(--text-faint)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{l}</button>
              ))}
            </div>
          </div>
          {friendList.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8, display: "block" }}>好友列表 ({friendList.length})</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {friendList.map(f => (
                  <div key={f.uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--panel-alt)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                    <AvatarImg avatarImage={f.avatarImage} avatar={f.avatar} color={f.color} size={32} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{f.nickname}</div>
                      <div style={{ fontSize: 11, color: getStatus(f.status).color }}>{getStatus(f.status).label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8, display: "block" }}>個人背景</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {PROFILE_GRADIENTS.map((g, i) => (
                <button key={i} onClick={() => { setProfileBg(g); setProfileBgType("gradient"); }}
                  style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: g, border: profileBg === g && profileBgType === "gradient" ? "3px solid #fff" : "2px solid transparent", cursor: "pointer", flexShrink: 0 }} />
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => bgFileRef.current?.click()} disabled={bgUploading}
                style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "7px 12px", color: "var(--text-muted)", cursor: bgUploading ? "default" : "pointer", fontSize: 13 }}>
                {bgUploading ? "上傳中..." : "更換背景圖片"}
              </button>
              {profileBgType === "image" && (
                <button onClick={() => { setProfileBg(PROFILE_GRADIENTS[0]); setProfileBgType("gradient"); }}
                  style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 12 }}>移除背景</button>
              )}
              <input ref={bgFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBgUploading(true);
                try {
                  const url = await uploadToR2(file);
                  setProfileBg(url);
                  setProfileBgType("image");
                } catch {
                  toast("背景上傳失敗，請重試");
                } finally {
                  setBgUploading(false);
                  e.target.value = "";
                }
              }} />
            </div>
          </div>
          <button onClick={() => onSave({ nickname, bio, avatar, color, statusText, status, signature, profileBg, profileBgType })} style={{ width: "100%", background: "linear-gradient(135deg,var(--accent),var(--accent-2))", border: "none", borderRadius: "var(--radius-md)", padding: "12px", color: "var(--accent-text)", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            儲存設定
          </button>
        </div>
      </div>
    </div>
  );
}

// FriendSearch????????????????????????????????????????????????????????????

function FriendSearch({ myUid, myProfile, onClose, onSendRequest }) {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!searchText.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const q = searchText.trim();
        const found = {};
        const emailSnap = await getDocs(query(collection(db, 'users'), where('email', '==', q)));
        emailSnap.docs.forEach(d => { found[d.id] = { uid: d.id, ...d.data() }; });
        const nickSnap = await getDocs(query(collection(db, 'users'), where('nickname', '>=', q), where('nickname', '<=', q + ''), limit(10)));
        nickSnap.docs.forEach(d => { found[d.id] = { uid: d.id, ...d.data() }; });
        const filtered = Object.values(found).filter(u =>
          u.uid !== myUid &&
          !(myProfile.friends || []).includes(u.uid) &&
          !(myProfile.pendingOut || []).includes(u.uid)
        );
        setResults(filtered);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText, myUid, myProfile.friends, myProfile.pendingOut]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "10vh", zIndex: 600 }}>
      <div className="cr-modal-full" style={{ background: "var(--panel)", borderRadius: 20, width: 520, maxWidth: "95vw", border: "1px solid var(--border)", padding: 28, boxSizing: "border-box", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: "var(--text)", margin: 0, fontSize: 20, fontWeight: 700 }}>新增好友</h3>
          <button onClick={onClose} className="cr-close-btn" style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 24 }}>✕</button>
        </div>
        <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="輸入暱稱或電郵搜尋..."
          style={{ width: "100%", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "13px 16px", color: "var(--text)", fontSize: 16, outline: "none", boxSizing: "border-box", marginBottom: 16 }} />
        {searching && <div style={{ textAlign: "center", color: "var(--text-faint)", fontSize: 16 }}>搜尋中...</div>}
        {!searching && results.length === 0 && searchText && <div style={{ textAlign: "center", color: "var(--text-faint)", fontSize: 16, padding: "16px 0" }}>找不到相關使用者</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {results.map(u => (
            <div key={u.uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--panel-alt)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
              <AvatarImg avatarImage={u.avatarImage} avatar={u.avatar} color={u.color} size={48} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "var(--text)", fontSize: 16 }}>{u.nickname}</div>
                {u.signature && <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>{u.signature}</div>}
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{u.email}</div>
              </div>
              <button onClick={() => onSendRequest(u.uid)} style={{ background: "var(--accent)", border: "none", borderRadius: "var(--radius-md)", padding: "9px 18px", color: "var(--accent-text)", fontSize: 15, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>加好友</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// FriendRequests

function FriendRequests({ myProfile, onAccept, onDecline, onClose }) {
  const [pendingProfiles, setPendingProfiles] = useState([]);

  useEffect(() => {
    const uids = myProfile.pendingIn || [];
    if (!uids.length) { setPendingProfiles([]); return; }
    Promise.all(uids.map(uid => getDoc(doc(db, 'users', uid)))).then(snaps => {
      setPendingProfiles(snaps.filter(s => s.exists()).map(s => ({ uid: s.id, ...s.data() })));
    });
  }, [(myProfile.pendingIn || []).join(',')]);

  return (
    <div className="cr-sheet-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600 }}>
      <div className="cr-sheet" style={{ background: "var(--panel)", borderRadius: "var(--radius-lg)", width: 380, maxWidth: "92vw", border: "1px solid var(--border)", padding: 24, boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ color: "var(--text)", margin: 0, fontSize: 16, fontWeight: 700 }}>好友邀請 ({pendingProfiles.length})</h3>
          <button onClick={onClose} className="cr-close-btn" style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        {pendingProfiles.length === 0 && <div style={{ textAlign: "center", color: "var(--text-faint)", fontSize: 14, padding: "20px 0" }}>目前沒有待處理的邀請</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pendingProfiles.map(u => (
            <div key={u.uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", background: "var(--panel-alt)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
              <AvatarImg avatarImage={u.avatarImage} avatar={u.avatar} color={u.color} size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "var(--text)", fontSize: 14 }}>{u.nickname}</div>
                <div style={{ fontSize: 11, color: "var(--text-faint)" }}>想加你為好友</div>
              </div>
              <button onClick={() => onAccept(u.uid)} style={{ background: "#22c55e", border: "none", borderRadius: "var(--radius-sm)", padding: "6px 12px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", marginRight: 4 }}>接受</button>
              <button onClick={() => onDecline(u.uid)} style={{ background: "#ef4444", border: "none", borderRadius: "var(--radius-sm)", padding: "6px 12px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>拒絕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// CreateGroupModal

function CreateGroupModal({ friends, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState([]);

  const toggle = (uid) => {
    setSelected(prev => prev.includes(uid) ? prev.filter(u => u !== uid) : [...prev, uid]);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600 }}>
      <div className="cr-modal-full" style={{ background: "var(--panel)", borderRadius: 20, width: 400, maxWidth: "92vw", maxHeight: "80vh", overflow: "auto", border: "1px solid var(--border)", padding: 24, boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: "var(--text)", margin: 0, fontSize: 18, fontWeight: 700 }}>建立群組</h3>
          <button onClick={onClose} className="cr-close-btn" style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 24 }}>✕</button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 6, display: "block" }}>群組名稱</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="輸入群組名稱..."
            style={{ width: "100%", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8, display: "block" }}>成員（選擇好友加入）</label>
          {friends.length === 0 && <div style={{ color: "var(--text-faint)", fontSize: 13, padding: "8px 0" }}>尚無好友可加入群組</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {friends.map(f => (
              <button key={f.uid} onClick={() => toggle(f.uid)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: selected.includes(f.uid) ? "var(--accent-active)" : "var(--panel-alt)", border: `1px solid ${selected.includes(f.uid) ? "var(--accent)" : "var(--border)"}`, borderRadius: "var(--radius-md)", cursor: "pointer", textAlign: "left", width: "100%" }}>
                <AvatarImg avatarImage={f.avatarImage} avatar={f.avatar} color={f.color} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "var(--text)", fontSize: 14 }}>{f.nickname}</div>
                </div>
                <span style={{ color: selected.includes(f.uid) ? "#93c5fd" : "var(--text-dim)", fontSize: 18 }}>
                  {selected.includes(f.uid) ? "✓" : "+"}
                </span>
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => name.trim() && onCreate(name.trim(), selected)}
          disabled={!name.trim()}
          style={{ width: "100%", background: name.trim() ? "linear-gradient(135deg,var(--accent),var(--accent-2))" : "var(--panel)", border: "none", borderRadius: "var(--radius-md)", padding: "12px", color: name.trim() ? "var(--accent-text)" : "var(--text-dim)", fontSize: 15, fontWeight: 700, cursor: name.trim() ? "pointer" : "default" }}>
          建立群組 ({1 + selected.length} 人)
        </button>
      </div>
    </div>
  );
}

// RankBadge

// Fixed rank-based colors for the tipping leaderboard — a data/ranking
// semantic that stays constant regardless of the active site theme (incl.
// 柔和珠光's 6 accent palettes; see design spec §6). Rank #2 uses a dark
// seal so it doesn't read as a near-duplicate of rank #1's gold.
const RANK_PALETTE = [
  { hex: "#F4BF45", badge: "#F4BF45", badgeText: "#444444", badgeTextMuted: "rgba(68,68,68,0.7)" },
  { hex: "#F9C95F", badge: "#444444", badgeText: "#F9C95F", badgeTextMuted: "rgba(249,201,95,0.75)" },
  { hex: "#F5A58C", badge: "#F5A58C", badgeText: "#444444", badgeTextMuted: "rgba(68,68,68,0.7)" },
  { hex: "#A2C3E7", badge: "#A2C3E7", badgeText: "#444444", badgeTextMuted: "rgba(68,68,68,0.7)" },
  { hex: "#C0ADDE", badge: "#C0ADDE", badgeText: "#444444", badgeTextMuted: "rgba(68,68,68,0.7)" },
  { hex: "#DDDDDD", badge: "#DDDDDD", badgeText: "#444444", badgeTextMuted: "rgba(68,68,68,0.7)" },
  { hex: "#FCC1AE", badge: "#FCC1AE", badgeText: "#444444", badgeTextMuted: "rgba(68,68,68,0.7)" },
  { hex: "#D9D8D9", badge: "#D9D8D9", badgeText: "#444444", badgeTextMuted: "rgba(68,68,68,0.7)" },
  { hex: "#A7D7CC", badge: "#A7D7CC", badgeText: "#444444", badgeTextMuted: "rgba(68,68,68,0.7)" },
].map(r => {
  const n = parseInt(r.hex.slice(1), 16);
  const rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  return {
    ...r,
    rowBg: `linear-gradient(90deg, rgba(${rgb},0.55) 0%, rgba(${rgb},0.22) 55%, rgba(251,249,245,0.4) 100%)`,
    ring: `rgba(${rgb},0.9)`,
    border: `rgba(${rgb},0.35)`,
    amount: "#2C2C2C",
  };
});
const RANK_PALETTE_FALLBACK = {
  badge: "#E5E1D8", badgeText: "#444444", badgeTextMuted: "rgba(68,68,68,0.7)",
  rowBg: "rgba(229,225,216,0.4)", ring: "rgba(68,68,68,0.3)", border: "rgba(68,68,68,0.15)", amount: "#2C2C2C",
};
const RANK_TITLES = ["CHAMPION", "RUNNER-UP", "TOP SUPPORTER", "GREAT SUPPORTER", "KIND SUPPORTER", "VALUE SUPPORTER", "LOYAL SUPPORTER", "FRIENDLY SUPPORTER", "NEW SUPPORTER"];

function RankBadge({ rank, size = 32 }) {
  const bg =
    rank === 1 ? "linear-gradient(135deg,#f59e0b,#fbbf24)" :
    rank === 2 ? "linear-gradient(135deg,var(--text-muted),var(--text-subtle))" :
    rank === 3 ? "linear-gradient(135deg,#d97706,#b45309)" :
               "linear-gradient(135deg,var(--border),var(--text-dim))";
  return (
    <div style={{ width: size * 1.6, height: size, borderRadius: size * 0.5, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.45, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
      {rank}
    </div>
  );
}

// DonateModal

function DonateModal({ myProfile, onClose }) {
  const [amount, setAmount] = useState(50);
  const [customInput, setCustomInput] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading] = useState(false);

  const finalAmount = useCustom ? (parseInt(customInput, 10) || 0) : amount;

  const handleDonate = async () => {
    if (finalAmount < 1) { toast("請輸入最少 HK$1 的金額"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: myProfile.uid,
          userNickname: myProfile.nickname || "",
          userAvatar: myProfile.avatar || "",
          userColor: myProfile.color || "",
          userAvatarImage: myProfile.avatarImage || "",
          amount: finalAmount,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast("付款失敗：" + (data.error || "請稍後再試"));
    } catch {
      toast("付款發生錯誤，請重試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cr-sheet-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600 }}>
      <div className="cr-sheet" style={{ background: "var(--panel)", borderRadius: 20, width: 380, maxWidth: "92vw", border: "1px solid var(--border)", padding: 28, boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text)" }}>🎁 打賞</h3>
          <button onClick={onClose} className="cr-close-btn" style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 24 }}>✕</button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          {[10, 30, 50, 100].map(a => (
            <button key={a} onClick={() => { setAmount(a); setUseCustom(false); }}
              style={{ flex: "1 1 70px", padding: "12px 0", borderRadius: "var(--radius-md)", border: !useCustom && amount === a ? "2px solid #f59e0b" : "2px solid var(--border)", background: !useCustom && amount === a ? "rgba(245,158,11,0.15)" : "var(--panel-alt)", color: !useCustom && amount === a ? "#fbbf24" : "var(--text-muted)", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
              HK${a}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: useCustom ? "#fbbf24" : "var(--text-faint)", fontWeight: 700, fontSize: 15, pointerEvents: "none" }}>HK$</span>
            <input
              type="number" min="1" placeholder="輸入金額"
              value={customInput}
              onChange={e => { setCustomInput(e.target.value); setUseCustom(true); }}
              onFocus={() => setUseCustom(true)}
              style={{ width: "100%", background: useCustom ? "rgba(245,158,11,0.1)" : "var(--panel-alt)", border: useCustom ? "2px solid #f59e0b" : "2px solid var(--border)", borderRadius: "var(--radius-md)", padding: "12px 14px 12px 52px", color: "var(--text)", fontSize: 16, fontWeight: 700, outline: "none", boxSizing: "border-box" }}
            />
          </div>
        </div>
        <button onClick={handleDonate} disabled={loading || finalAmount < 1}
          style={{ width: "100%", background: finalAmount >= 1 && !loading ? "linear-gradient(135deg,#f59e0b,#d97706)" : "var(--border)", border: "none", borderRadius: "var(--radius-md)", padding: "14px", color: "#fff", fontSize: 16, fontWeight: 700, cursor: finalAmount >= 1 && !loading ? "pointer" : "default", transition: "all 0.15s" }}>
          {loading ? "處理中..." : finalAmount >= 1 ? `🎁 打賞 HK${finalAmount}` : "🎁 打賞"}
        </button>
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-dim)", marginTop: 10 }}>支援信用卡、Apple Pay 等付款方式</div>
      </div>
    </div>
  );
}

// Main ChatApp

export default function ChatApp({ user }) {
  const router = useRouter();
  const uid = user.uid;

  const [myProfile,      setMyProfile]      = useState(null);
  const [myProfileError, setMyProfileError] = useState('');
  const [friendProfiles, setFriendProfiles] = useState({});
  const [hallMessages,   setHallMessages]   = useState([]);
  const [privateMessages,setPrivateMessages]= useState([]);
  const [activeFriendId, setActiveFriendId] = useState(null);
  const [hallInput,      setHallInput]      = useState("");
  const [privateInput,   setPrivateInput]   = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(null); // null | 'hall' | 'private' | 'group'
  const [hallUploading,  setHallUploading]  = useState(false);
  const [privateUploading, setPrivateUploading] = useState(false);
  const [showProfile,    setShowProfile]    = useState(false);
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [showFriendReqs,   setShowFriendReqs]   = useState(false);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [contextMenu,    setContextMenu]    = useState(null);
  const [friendInfo,     setFriendInfo]     = useState(null);
  // 每個好友聊天室的未讀數（{ [friendUid]: count }）——來自下面對每個好友各自
  // 開的 private_chats/{chatId} 全域監聽，掛載後就跑，不用打開聊天室才有資料。
  const [privateUnread,  setPrivateUnread]  = useState({});

  // Group states
  const [myGroups,       setMyGroups]       = useState([]);
  const [activeGroupId,  setActiveGroupId]  = useState(null);
  const [groupMessages,  setGroupMessages]  = useState([]);
  const [showCreateGroup,setShowCreateGroup]= useState(false);
  const [groupInput,     setGroupInput]     = useState("");
  const [groupUploading, setGroupUploading] = useState(false);
  // 點群組聊天上方的名字打開的群組資訊頁（GroupInfoView）——取代整個中間欄，
  // 不是疊在上面的浮層，所以切換群組時要記得歸零，不然切去別的群組還留著。
  const [showGroupInfo,  setShowGroupInfo]  = useState(false);

  // Leaderboard states
  const [showLeaderboard,  setShowLeaderboard]  = useState(false);
  const [donations,        setDonations]        = useState([]);
  const [showDonateModal,  setShowDonateModal]  = useState(false);

  // Vocab states
  const [showVocab,          setShowVocab]          = useState(false);
  const [showSpanish,        setShowSpanish]        = useState(false);
  const [showSpanishCourse,  setShowSpanishCourse]  = useState(false);
  const [showCustomVocab,    setShowCustomVocab]    = useState(false);
  const [showDict,           setShowDict]           = useState(false);
  const [frenchView,         setFrenchView]         = useState(null); // null | 'pron' | 'a1' | 'grammar' | 'a1exam'
  const [showSpanishPron,    setShowSpanishPron]    = useState(false);
  const [showSpanishGrammar, setShowSpanishGrammar] = useState(false);
  const [showSpanishVerbs,   setShowSpanishVerbs]   = useState(false);
  const [spanishCourseNoteContext, setSpanishCourseNoteContext] = useState(null); // {key, title} reported by SpanishCourseRoom's current lesson
  const [showEnglishPron,    setShowEnglishPron]    = useState(false);
  const [showIeltsBand4,     setShowIeltsBand4]     = useState(false);
  const [showFeed,           setShowFeed]           = useState(false);
  // 動態消息裡點擊貼文作者頭像/名字要看的個人頁面 uid（null = 沒有開啟）——
  // 用這個狀態把 ProfileView 換進 Feed 的位置，而不是像以前那樣用
  // <Link href="/profile/[uid]"> 整個離開聊天室 SPA。
  const [viewProfileUid,     setViewProfileUid]     = useState(null);
  const [showImageEditor,    setShowImageEditor]    = useState(false);
  const [showAiChat,         setShowAiChat]         = useState(false);
  const [showDocConvert,     setShowDocConvert]     = useState(false);
  const [showAiCompanion,    setShowAiCompanion]    = useState(false);
  const [showCompanionCreator, setShowCompanionCreator] = useState(false);
  const [showUpgrade,        setShowUpgrade]        = useState(false);
  // 日曆現在是左側的一個獨立功能（跟排行榜等其他功能同一種切換方式），
  // 不再是右欄永遠顯示的東西——右欄改放群組跟好友（見 .cr-cal 那段）。
  const [showCalendar,       setShowCalendar]       = useState(false);
  // 影片瀏覽入口：搜尋/瀏覽頻道（VideoHub）跟打開某個頻道的個人頁面（沿用
  // ProfileView，直接跳到它的「影片」分頁）共用這一個 view，videoHubUid 是
  // null 時顯示搜尋/熱門頻道清單，有值時顯示那個人的頻道頁。
  const [showVideoHub,       setShowVideoHub]       = useState(false);
  const [videoHubUid,        setVideoHubUid]        = useState(null);

  // Mobile / sidebar states
  const isMobile = useIsMobile();
  const [calendarOpen,   setCalendarOpen]   = useState(false);
  const [mobileView,     setMobileView]     = useState(null); // 'more' | null (content-driven; 'list' 已改用下面的 sidebarOpen 抽屜)
  const [sidebarOpen,    setSidebarOpen]    = useState(false); // 手機版側邊抽屜的「已定案」開關狀態（拖曳中的即時位置不經過這個 state，見 dragStateRef）
  // 桌面版導覽欄收合狀態（跟手機版的抽屜 sidebarOpen 是兩套機制，互不影響）。
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 側欄功能方塊按住拖曳調整順序——桌面版限定（手機版側欄是完全不同的簡化排法）。
  // 動態消息／公共大廳固定在最上面當錨點，其餘全部（原本分在三個資料夾裡的
  // 項目也拆出來攤平）都在同一份順序清單裡，彼此都可以互相拖曳交換位置。
  const sidebarLayout = useSidebarLayout("cr-sidebar-v1", "cr-order-top-v3", [
    "leaderboard", "calendar", "videoHub",
    "upgrade", "cinema", "imageEditor", "aiChat", "docConvert", "aiCompanion",
    "englishPron", "ieltsBand4", "vocab",
    "spanish", "spanishCourse", "spanishPron", "spanishGrammar", "spanishVerbs",
    "customVocab", "dict",
  ]);

  useEffect(() => {
    try {
      if (localStorage.getItem("cr-sidebar-collapsed") === "1") setSidebarCollapsed(true);
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("cr-sidebar-collapsed", sidebarCollapsed ? "1" : "0"); } catch {}
  }, [sidebarCollapsed]);

  // 桌面版可拖曳調整寬度：側欄跟日曆欄各自的寬度、拖完存 localStorage，
  // 中間 <main> 本來就是 flex:1，兩邊寬度一變它自動跟著縮放，不用另外處理。
  const SIDEBAR_DEFAULT_WIDTH = 236;
  const CAL_DEFAULT_WIDTH = 252;
  // 資料夾 rail（.cr-folder-rail）固定寬度——收合/展開按鈕是 .cr-sidebar 的
  // sibling、用 left 絕對定位貼齊側欄邊界，rail 插進 .cr-shell 之後側欄本身
  // 往右挪了這麼多，這裡也要跟著補上，不然按鈕位置會對不準。
  const FOLDER_RAIL_WIDTH = 56;
  // 資料夾內容浮動面板：跟 rail 上被點的那個圖示同高度冒出來（不是側欄清單
  // 的一部分，是疊在上面的獨立圖層）——shellElRef 量的是 .cr-shell 本身的
  // 位置，folderPanelTop 是點下去那一刻算出來、面板要貼齊哪個 y 座標。
  const shellElRef = useRef(null);
  const [folderPanelTop, setFolderPanelTop] = useState(76);
  const openFolderPanel = useCallback((fid, e) => {
    const iconRect = e.currentTarget.getBoundingClientRect();
    const shellRect = shellElRef.current?.getBoundingClientRect();
    if (shellRect) setFolderPanelTop(Math.max(8, iconRect.top - shellRect.top));
    sidebarLayout.setActiveFolder(fid);
  }, [sidebarLayout]);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [calWidth, setCalWidth] = useState(CAL_DEFAULT_WIDTH);
  const [resizingPanel, setResizingPanel] = useState(null); // "sidebar" | "cal" | null — suppresses the width transition mid-drag

  useEffect(() => {
    try {
      const sw = parseInt(localStorage.getItem("cr-sidebar-width"), 10);
      if (sw >= 220 && sw <= 420) setSidebarWidth(sw);
      const cw = parseInt(localStorage.getItem("cr-cal-width"), 10);
      if (cw >= 200 && cw <= 420) setCalWidth(cw);
    } catch {}
  }, []);

  const startPanelResize = useCallback((e, which) => {
    e.preventDefault();
    setResizingPanel(which);
    const startX = e.clientX;
    const startWidth = which === "sidebar" ? sidebarWidth : calWidth;
    const setW = which === "sidebar" ? setSidebarWidth : setCalWidth;
    const min = which === "sidebar" ? 220 : 200;
    const max = 420;
    const onMove = (ev) => {
      // Calendar panel sits on the right edge, so dragging it right should
      // shrink it (not grow) — flip the delta's sign for that one handle.
      const dx = which === "sidebar" ? (ev.clientX - startX) : (startX - ev.clientX);
      setW(Math.min(max, Math.max(min, startWidth + dx)));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setResizingPanel(null);
      setW(w => {
        try { localStorage.setItem(which === "sidebar" ? "cr-sidebar-width" : "cr-cal-width", String(w)); } catch {}
        return w;
      });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [sidebarWidth, calWidth]);

  // 聊天訊息文字大小（可調整、可復原），表情/貼圖用相對單位（em）或按比例縮放，
  // 跟著這個設定一起變大變小。控制項在 ThemeToggle 的設定選單裡（見下方 <ThemeToggle>）。
  const DEFAULT_MSG_FONT_SIZE = 14;
  const [msgFontSize, setMsgFontSizeState] = useState(DEFAULT_MSG_FONT_SIZE);

  useEffect(() => {
    try {
      const fs = parseInt(localStorage.getItem("cr-msg-font-size"), 10);
      if (fs >= 10 && fs <= 30) setMsgFontSizeState(fs);
    } catch {}
  }, []);

  const setMsgFontSize = useCallback((size) => {
    const clamped = Math.min(30, Math.max(10, size));
    setMsgFontSizeState(clamped);
    try { localStorage.setItem("cr-msg-font-size", String(clamped)); } catch {}
  }, []);

  const resetPanelWidth = useCallback((which) => {
    if (which === "sidebar") {
      setSidebarWidth(SIDEBAR_DEFAULT_WIDTH);
      try { localStorage.setItem("cr-sidebar-width", String(SIDEBAR_DEFAULT_WIDTH)); } catch {}
    } else {
      setCalWidth(CAL_DEFAULT_WIDTH);
      try { localStorage.setItem("cr-cal-width", String(CAL_DEFAULT_WIDTH)); } catch {}
    }
  }, []);
  // The only way to trigger the reset above used to be double-clicking the
  // (undiscoverable, unlabeled) drag handle — folded into the settings
  // menu's existing 復原 button (see the ThemeToggle usage below) instead of
  // adding a second one, so there's one obvious "put things back" action.
  const resetPanelWidths = useCallback(() => {
    resetPanelWidth("sidebar");
    resetPanelWidth("cal");
  }, [resetPanelWidth]);

  const resetAllViews = useCallback(() => {
    setActiveFriendId(null); setActiveGroupId(null);
    setShowLeaderboard(false); setShowCinema(false);
    setShowVocab(false); setShowSpanish(false); setShowSpanishCourse(false);
    setShowCustomVocab(false); setShowDict(false); setFrenchView(null);
    setShowSpanishPron(false); setShowSpanishGrammar(false); setShowSpanishVerbs(false);
    setShowEnglishPron(false); setShowIeltsBand4(false);
    setShowFeed(false); setShowImageEditor(false); setShowAiChat(false); setShowDocConvert(false);
    setShowAiCompanion(false); setShowUpgrade(false); setViewProfileUid(null);
    setShowCalendar(false); setShowGroupInfo(false);
    // 影片功能故意不歸零 videoHubUid：切去別的功能頁只是把這個 view 藏起來
    // （見 .cr-main 裡 showVideoHub 那段改用 display:none 而不是整個卸載），
    // 這樣使用者點回「影片」時，剛剛看到哪個頻道／哪支影片、播到哪裡都還在。
    // 真的要離開某個頻道回到搜尋列表，是 ChannelProfileView 自己的返回鍵
    // 呼叫 setVideoHubUid(null)，不是靠切換頁面順便清掉。
    setShowVideoHub(false);
  }, []);

  // Cinema states
  const [showCinema,       setShowCinema]       = useState(false);
  const [cinemaView,       setCinemaView]       = useState('list');
  const [cinemaRooms,      setCinemaRooms]      = useState([]);
  const [activeCinemaRoom, setActiveCinemaRoom] = useState(null);
  const [cinemaComments,   setCinemaComments]   = useState([]);
  const [cinemaInput,      setCinemaInput]      = useState('');
  const [isHosting,        setIsHosting]        = useState(false);
  const [screenStream,     setScreenStream]     = useState(null);
  const [remoteStream,     setRemoteStream]     = useState(null);
  const [cinemaTitleInput, setCinemaTitleInput] = useState('');
  const [showCreateCinema, setShowCreateCinema] = useState(false);
  const [cinemaViewerCount, setCinemaViewerCount] = useState(0);

  const messagesEndRef = useRef(null);
  const loadedFriendIds = useRef(new Set());
  const longPressTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);
  const hallFileRef = useRef(null);
  const hallEmojiBtnRef = useRef(null);
  const privateEmojiBtnRef = useRef(null);
  const groupEmojiBtnRef = useRef(null);
  const privateFileRef = useRef(null);
  const groupFileRef = useRef(null);
  const groupAvatarFileRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const myPeerRef = useRef(null);
  const cinemaCommentsEndRef = useRef(null);
  // 手機版側邊抽屜：iOS 風格 1:1 跟手拖曳。sidebarElRef/mainElRef/backdropElRef
  // 在拖曳過程中直接寫 DOM style（不經過 React state／re-render），確保零延遲；
  // dragStateRef 存單次拖曳的暫存資訊，放開後才用 settleDrawer() 收斂回 React state。
  const sidebarElRef = useRef(null);
  const mainElRef = useRef(null);
  const backdropElRef = useRef(null);
  const dragStateRef = useRef({ dragging: false });
  const signalUnsubRef = useRef(null);
  const commentsUnsubRef = useRef(null);
  const viewersUnsubRef = useRef(null);

  const chatId = activeFriendId ? [uid, activeFriendId].sort().join('_') : null;

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [contextMenu]);

  useEffect(() => {
    return onSnapshot(doc(db, 'users', uid), snap => {
      if (snap.exists()) setMyProfile({ uid, ...snap.data() });
    }, (e) => {
      console.error('[ChatRoom] profile snapshot failed', e);
      setMyProfileError('無法載入你的個人資料，請檢查網路連線');
    });
  }, [uid]);

  // Safety net: an onSnapshot listener that never errors and never delivers
  // a snapshot (dropped connection, blocked request) would otherwise leave
  // the user stuck on the loading screen below indefinitely.
  useEffect(() => {
    if (myProfile) return;
    const t = setTimeout(() => {
      setMyProfileError(prev => prev || '載入時間過長，可能是網路連線問題');
    }, 12000);
    return () => clearTimeout(t);
  }, [myProfile, uid]);

  const friendsKey = myProfile?.friends?.join(',') || '';
  useEffect(() => {
    if (!myProfile?.friends?.length) return;
    const missing = myProfile.friends.filter(fid => !loadedFriendIds.current.has(fid));
    if (!missing.length) return;
    missing.forEach(fid => loadedFriendIds.current.add(fid));
    Promise.all(missing.map(fid => getDoc(doc(db, 'users', fid)))).then(snaps => {
      const profiles = {};
      snaps.forEach(s => { if (s.exists()) profiles[s.id] = { uid: s.id, ...s.data() }; });
      if (Object.keys(profiles).length) setFriendProfiles(prev => ({ ...prev, ...profiles }));
    });
  }, [friendsKey]);

  // 全域未讀監聽——每個好友各自的 private_chats/{chatId} 摘要文件開一份
  // onSnapshot，不管有沒有打開那個聊天室都在跑（掛載後就啟動，整個 session
  // 期間都在），側欄好友列表才能不用點進去就看到未讀角標。好友清單變動時
  // 自動補齊/收掉對應的監聽。
  const privateUnreadUnsubsRef = useRef(new Map());
  useEffect(() => {
    const friends = myProfile?.friends || [];
    const unsubs = privateUnreadUnsubsRef.current;
    for (const [fid, unsub] of unsubs) {
      if (!friends.includes(fid)) {
        unsub();
        unsubs.delete(fid);
        setPrivateUnread(prev => {
          if (!(fid in prev)) return prev;
          const next = { ...prev };
          delete next[fid];
          return next;
        });
      }
    }
    friends.forEach(fid => {
      if (unsubs.has(fid)) return;
      const cid = [uid, fid].sort().join('_');
      const unsub = onSnapshot(doc(db, 'private_chats', cid), snap => {
        const count = snap.exists() ? (snap.data().unreadCount?.[uid] || 0) : 0;
        setPrivateUnread(prev => (prev[fid] === count ? prev : { ...prev, [fid]: count }));
      }, (e) => console.error('[ChatRoom] private unread listener failed', { fid, code: e?.code }));
      unsubs.set(fid, unsub);
    });
  }, [friendsKey, uid]);

  useEffect(() => () => { privateUnreadUnsubsRef.current.forEach(unsub => unsub()); }, []);

  // 打開聊天室（好友或群組）時把自己的未讀數寫回 0——依賴陣列同時包含
  // privateUnread/myGroups，訊息在聊天室開著的當下持續進來也會立刻歸零，
  // 不會等使用者切走再切回來才清掉。
  useEffect(() => {
    if (!activeFriendId) return;
    if (!(privateUnread[activeFriendId] > 0)) return;
    const cid = [uid, activeFriendId].sort().join('_');
    setDoc(doc(db, 'private_chats', cid), { unreadCount: { [uid]: 0 } }, { merge: true })
      .catch(e => console.error('[ChatRoom] clear private unread failed', e));
  }, [activeFriendId, privateUnread, uid]);

  useEffect(() => {
    if (!activeGroupId) return;
    const g = myGroups.find(x => x.id === activeGroupId);
    if (!(g?.unreadCount?.[uid] > 0)) return;
    updateDoc(doc(db, 'groups', activeGroupId), { [`unreadCount.${uid}`]: 0 })
      .catch(e => console.error('[ChatRoom] clear group unread failed', e));
  }, [activeGroupId, myGroups, uid]);

  // 分頁標題角標：任何聊天室有未讀就在 <title> 前面加 (N)，歸零時還原。
  const originalTitleRef = useRef(null);
  useEffect(() => {
    if (originalTitleRef.current == null) {
      originalTitleRef.current = document.title.replace(/^\(\d+\+?\)\s*/, '');
    }
  }, []);
  useEffect(() => {
    const totalPrivate = Object.values(privateUnread).reduce((a, b) => a + (b || 0), 0);
    const totalGroup = myGroups.reduce((a, g) => a + (g.unreadCount?.[uid] || 0), 0);
    const total = totalPrivate + totalGroup;
    const base = originalTitleRef.current ?? document.title;
    document.title = total > 0 ? `(${total > 99 ? '99+' : total}) ${base}` : base;
  }, [privateUnread, myGroups, uid]);

  // Guards the first snapshot of each message listener below, which fires
  // with the whole existing history as a batch of "added" docChanges —
  // without this, opening a chat would play one ding per historical message
  // instead of only for genuinely new ones that arrive afterward.
  const hallSoundReadyRef = useRef(false);
  const privateSoundReadyRef = useRef(false);
  const groupSoundReadyRef = useRef(false);

  // Plays at most one ding per snapshot batch, only for messages someone
  // else sent — sending your own message shouldn't ding yourself.
  const notifyIfIncoming = (docChanges, readyRef) => {
    if (!readyRef.current) { readyRef.current = true; return; }
    const hasIncoming = docChanges.some(c => c.type === "added" && c.doc.data().senderId !== uid);
    if (hasIncoming) playNotificationSound();
  };

  useEffect(() => {
    hallSoundReadyRef.current = false;
    const q = query(collection(db, 'hall_messages'), orderBy('createdAt'), limitToLast(50));
    return onSnapshot(q, snap => {
      notifyIfIncoming(snap.docChanges(), hallSoundReadyRef);
      setHallMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  useEffect(() => {
    if (!activeFriendId) { setPrivateMessages([]); return; }
    privateSoundReadyRef.current = false;
    const q = query(collection(db, 'private_chats', chatId, 'messages'), orderBy('createdAt'), limitToLast(50));
    return onSnapshot(q, snap => {
      notifyIfIncoming(snap.docChanges(), privateSoundReadyRef);
      setPrivateMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [uid, activeFriendId]);

  // Groups listener
  useEffect(() => {
    const q = query(collection(db, 'groups'), where('members', 'array-contains', uid));
    return onSnapshot(q, snap => {
      setMyGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [uid]);

  // Group messages listener
  useEffect(() => {
    if (!activeGroupId) { setGroupMessages([]); return; }
    groupSoundReadyRef.current = false;
    const q = query(collection(db, 'groups', activeGroupId, 'messages'), orderBy('createdAt'), limitToLast(50));
    return onSnapshot(q, snap => {
      notifyIfIncoming(snap.docChanges(), groupSoundReadyRef);
      setGroupMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [activeGroupId]);

  // Donations listener
  useEffect(() => {
    return onSnapshot(collection(db, 'donations'), snap => {
      setDonations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Cinema rooms listener
  useEffect(() => {
    return onSnapshot(collection(db, 'cinemaRooms'), snap => {
      setCinemaRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Scroll cinema comments to bottom
  useEffect(() => {
    cinemaCommentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [cinemaComments]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [hallMessages, privateMessages, groupMessages]);

  useEffect(() => {
    const onVisibility = () => {
      const s = document.visibilityState === "hidden" ? "offline" : "online";
      updateDoc(doc(db, "users", uid), s === "online" ? { status: s } : { status: s, lastActiveAt: serverTimestamp() });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [uid]);

  // Standalone pages outside this SPA (e.g. /feed, /profile/[uid]) send the
  // mobile tab bar's "聊天"/"更多" taps back here as /?view=list|more, since
  // sidebarOpen/mobileView are local state they have no other way to reach.
  // Consume it once and strip it so it doesn't linger in the URL/history.
  useEffect(() => {
    if (!router.isReady) return;
    const v = router.query.view;
    if (v === "list") settleDrawer(true);
    else if (v === "more") setMobileView("more");
    else if (v === "editProfile") setShowProfile(true);
    else if (v === "imageEditor") { resetAllViews(); setShowImageEditor(true); }
    if (v === "list" || v === "more" || v === "editProfile" || v === "imageEditor") router.replace("/", undefined, { shallow: true });
  }, [router.isReady]);

  // 個人頁「傳訊息」按鈕送過來的 /?chat=<uid>，直接開對應的私訊視窗
  // （這條路徑先前完全沒接，該按鈕只會回首頁不會真的開聊天）。
  useEffect(() => {
    if (!router.isReady) return;
    const target = router.query.chat;
    if (typeof target === "string" && target && target !== uid) {
      resetAllViews();
      setActiveFriendId(target);
      router.replace("/", undefined, { shallow: true });
    }
  }, [router.isReady, router.query.chat]);

  // 手機版側邊抽屜：非拖曳觸發的開關（點 tab bar／選單項目／遮罩）統一經過這裡套用
  // transform，跟拖曳中直接寫 DOM style 用的是同一個 applyDrawerTransform，行為一致。
  useEffect(() => {
    if (!isMobile) return;
    const w = measuredDrawerWidth();
    applyDrawerTransform(sidebarOpen ? w : 0, w, true);
  }, [sidebarOpen, isMobile]);

  // 手機返回鍵：抽屜開著時，先關閉抽屜，不要直接離開頁面（見 settleDrawer 裡的 pushState）。
  useEffect(() => {
    function onPopState() {
      setSidebarOpen((open) => {
        if (open) {
          const w = measuredDrawerWidth();
          applyDrawerTransform(0, w, true);
        }
        return false;
      });
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Escape to close calendar overlay
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setCalendarOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Lock body scroll when calendar open on mobile
  useEffect(() => {
    if (isMobile && calendarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, calendarOpen]);

  useEffect(() => {
    let timer;
    let isAway = false;
    const AWAY_MS = 15 * 60 * 1000;
    const reset = () => {
      clearTimeout(timer);
      if (isAway) { isAway = false; updateDoc(doc(db, "users", uid), { status: "online" }); }
      timer = setTimeout(() => { isAway = true; updateDoc(doc(db, "users", uid), { status: "away", lastActiveAt: serverTimestamp() }); }, AWAY_MS);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach(e => document.addEventListener(e, reset));
    reset();
    return () => { clearTimeout(timer); events.forEach(e => document.removeEventListener(e, reset)); };
  }, [uid]);

  // Firestore write helpers

  const sendHall = useCallback(async () => {
    if (!hallInput.trim() || !myProfile) return;
    const text = hallInput.trim();
    setHallInput("");
    await addDoc(collection(db, 'hall_messages'), {
      senderId: uid, sender: myProfile.nickname, avatar: myProfile.avatar,
      senderAvatarImage: myProfile.avatarImage || "",
      text, createdAt: serverTimestamp(),
    });
  }, [hallInput, myProfile, uid]);

  const sendHallMedia = useCallback(async (file) => {
    if (!myProfile) return;
    setHallUploading(true);
    try {
      const url = await uploadToR2(file);
      const isVideo = file.type.startsWith("video/");
      await addDoc(collection(db, 'hall_messages'), {
        senderId: uid, sender: myProfile.nickname, avatar: myProfile.avatar,
        senderAvatarImage: myProfile.avatarImage || "",
        text: "", imageUrl: isVideo ? "" : url, videoUrl: isVideo ? url : "", createdAt: serverTimestamp(),
      });
    } catch {
      toast("上傳失敗，請重試");
    } finally {
      setHallUploading(false);
    }
  }, [myProfile, uid]);

  // 每次真的送出訊息後，同步更新聊天室摘要文件——實際邏輯搬到
  // lib/chatSummary.js（SharePostModal 分享貼文到私訊/群組時也要做同一件事，
  // 兩邊共用同一份，不再各自維護一份 unreadCount 寫法）。這裡只是包一層
  // useCallback 方便原本呼叫端的寫法不用改。
  const bumpPrivateChatSummary = useCallback((otherUid, preview) => {
    bumpPrivateChatSummaryLib(uid, otherUid, preview)
      .catch(e => console.error('[bumpPrivateChatSummary] failed', { code: e?.code, message: e?.message }));
  }, [uid]);

  const bumpGroupChatSummary = useCallback((groupId, preview) => {
    const group = myGroups.find(g => g.id === groupId);
    bumpGroupChatSummaryLib(uid, group?.members, groupId, preview)
      .catch(e => console.error('[bumpGroupChatSummary] failed', { code: e?.code, message: e?.message }));
  }, [uid, myGroups]);

  const sendPrivate = useCallback(async () => {
    if (!privateInput.trim() || !activeFriendId || !myProfile) return;
    const text = privateInput.trim();
    setPrivateInput("");
    await addDoc(collection(db, 'private_chats', chatId, 'messages'), {
      senderId: uid, sender: myProfile.nickname, avatar: myProfile.avatar,
      senderAvatarImage: myProfile.avatarImage || "",
      text, createdAt: serverTimestamp(),
    });
    bumpPrivateChatSummary(activeFriendId, text.slice(0, 50));
  }, [privateInput, activeFriendId, myProfile, uid, chatId, bumpPrivateChatSummary]);

  const sendPrivateMedia = useCallback(async (file) => {
    if (!activeFriendId || !myProfile) return;
    setPrivateUploading(true);
    try {
      const url = await uploadToR2(file);
      const isVideo = file.type.startsWith("video/");
      await addDoc(collection(db, 'private_chats', chatId, 'messages'), {
        senderId: uid, sender: myProfile.nickname, avatar: myProfile.avatar,
        senderAvatarImage: myProfile.avatarImage || "",
        text: "", imageUrl: isVideo ? "" : url, videoUrl: isVideo ? url : "", createdAt: serverTimestamp(),
      });
      bumpPrivateChatSummary(activeFriendId, isVideo ? "[影片]" : "[圖片]");
    } catch {
      toast("上傳失敗，請重試");
    } finally {
      setPrivateUploading(false);
    }
  }, [activeFriendId, myProfile, uid, chatId, bumpPrivateChatSummary]);

  const sendGroup = useCallback(async () => {
    if (!groupInput.trim() || !activeGroupId || !myProfile) return;
    const text = groupInput.trim();
    setGroupInput("");
    await addDoc(collection(db, 'groups', activeGroupId, 'messages'), {
      senderId: uid, sender: myProfile.nickname, avatar: myProfile.avatar,
      senderAvatarImage: myProfile.avatarImage || "",
      text, imageUrl: "", videoUrl: "", createdAt: serverTimestamp(),
    });
    bumpGroupChatSummary(activeGroupId, text.slice(0, 50));
  }, [groupInput, activeGroupId, myProfile, uid, bumpGroupChatSummary]);

  const sendGroupMedia = useCallback(async (file) => {
    if (!activeGroupId || !myProfile) return;
    setGroupUploading(true);
    try {
      const url = await uploadToR2(file);
      const isVideo = file.type.startsWith("video/");
      await addDoc(collection(db, 'groups', activeGroupId, 'messages'), {
        senderId: uid, sender: myProfile.nickname, avatar: myProfile.avatar,
        senderAvatarImage: myProfile.avatarImage || "",
        text: "", imageUrl: isVideo ? "" : url, videoUrl: isVideo ? url : "", createdAt: serverTimestamp(),
      });
      bumpGroupChatSummary(activeGroupId, isVideo ? "[影片]" : "[圖片]");
    } catch {
      toast("上傳失敗，請重試");
    } finally {
      setGroupUploading(false);
    }
  }, [activeGroupId, myProfile, uid, bumpGroupChatSummary]);

  // 群組頭像：跟 avatar emoji 共用同一個欄位，上傳成功後存成 R2 圖片網址；
  // 顯示端用 isGroupAvatarImage() 判斷欄位裡存的是 emoji 字串還是圖片網址。
  const [groupAvatarUploading, setGroupAvatarUploading] = useState(false);
  const changeGroupAvatar = useCallback(async (file) => {
    if (!activeGroupId) return;
    setGroupAvatarUploading(true);
    try {
      const url = await uploadToR2(file);
      await updateDoc(doc(db, 'groups', activeGroupId), { avatar: url });
    } catch {
      toast("上傳失敗，請重試");
    } finally {
      setGroupAvatarUploading(false);
    }
  }, [activeGroupId]);

  // 表情/手勢貼圖：item 來自 EmojiStickerPicker 的 onSendItem（手勢分類或真的貼圖會直接發送，
  // 不像一般 emoji 插入輸入框）。第一版全部 type:"emoji"，之後換成 PNG 貼圖只要 item.type
  // 變成 "sticker" 並帶 item.src，這裡就會自動把 stickerSrc 一起存進訊息文件。
  const buildItemMessage = useCallback((item) => ({
    senderId: uid, sender: myProfile?.nickname, avatar: myProfile?.avatar,
    senderAvatarImage: myProfile?.avatarImage || "",
    type: item.type === "sticker" ? "sticker" : "emoji",
    text: item.emoji || "", imageUrl: "", videoUrl: "",
    stickerId: item.id, stickerPackId: item.packId || null,
    stickerSrc: item.src || null,
    createdAt: serverTimestamp(),
  }), [myProfile, uid]);

  const sendHallItem = useCallback(async (item) => {
    if (!myProfile) return;
    try {
      await addDoc(collection(db, 'hall_messages'), buildItemMessage(item));
    } catch (e) {
      console.error("[sendHallItem] failed", { code: e?.code, message: e?.message, item });
    }
  }, [myProfile, buildItemMessage]);

  const sendPrivateItem = useCallback(async (item) => {
    if (!activeFriendId || !myProfile) return;
    try {
      await addDoc(collection(db, 'private_chats', chatId, 'messages'), buildItemMessage(item));
      bumpPrivateChatSummary(activeFriendId, item.type === "sticker" ? "[貼圖]" : (item.emoji || "[表情]"));
    } catch (e) {
      console.error("[sendPrivateItem] failed", { code: e?.code, message: e?.message, item });
    }
  }, [activeFriendId, myProfile, chatId, buildItemMessage, bumpPrivateChatSummary]);

  const sendGroupItem = useCallback(async (item) => {
    if (!activeGroupId || !myProfile) return;
    try {
      await addDoc(collection(db, 'groups', activeGroupId, 'messages'), buildItemMessage(item));
      bumpGroupChatSummary(activeGroupId, item.type === "sticker" ? "[貼圖]" : (item.emoji || "[表情]"));
    } catch (e) {
      console.error("[sendGroupItem] failed", { code: e?.code, message: e?.message, item });
    }
  }, [activeGroupId, myProfile, buildItemMessage, bumpGroupChatSummary]);

  const handleSaveProfile = useCallback(async (patch) => {
    await updateDoc(doc(db, 'users', uid), patch);
    setShowProfile(false);
  }, [uid]);

  const handleSendFriendRequest = useCallback(async (targetUid) => {
    await updateDoc(doc(db, 'users', uid),       { pendingOut: arrayUnion(targetUid) });
    await updateDoc(doc(db, 'users', targetUid), { pendingIn:  arrayUnion(uid) });
    setShowFriendSearch(false);
  }, [uid]);

  const handleAcceptFriend = useCallback(async (fromUid) => {
    await updateDoc(doc(db, 'users', uid),     { friends: arrayUnion(fromUid), pendingIn:  arrayRemove(fromUid) });
    await updateDoc(doc(db, 'users', fromUid), { friends: arrayUnion(uid),     pendingOut: arrayRemove(uid) });
  }, [uid]);

  const handleDeclineFriend = useCallback(async (fromUid) => {
    await updateDoc(doc(db, 'users', uid),     { pendingIn:  arrayRemove(fromUid) });
    await updateDoc(doc(db, 'users', fromUid), { pendingOut: arrayRemove(uid) });
  }, [uid]);

  const handleCreateGroup = useCallback(async (name, memberUids) => {
    const members = [uid, ...memberUids];
    const ref = await addDoc(collection(db, 'groups'), {
      name,
      avatar: "👥",
      members,
      createdBy: uid,
      createdAt: serverTimestamp(),
    });
    setActiveGroupId(ref.id);
    setActiveFriendId(null);
    setShowCreateGroup(false);
  }, [uid]);

  // Cinema / WebRTC

  const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  const startHostSignaling = (roomId, stream) => {
    const q = query(collection(db, 'cinemaRooms', roomId, 'signals'), where('type', '==', 'offer'));
    signalUnsubRef.current = onSnapshot(q, async snap => {
      for (const change of snap.docChanges()) {
        if (change.type !== 'added') continue;
        const { viewerId, data } = change.doc.data();
        if (peerConnectionsRef.current[viewerId]) continue;
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionsRef.current[viewerId] = pc;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        pc.onicecandidate = async ({ candidate }) => {
          if (candidate) await addDoc(collection(db, 'cinemaRooms', roomId, 'signals'), {
            type: 'host-ice', viewerId, data: candidate.toJSON(), createdAt: serverTimestamp(),
          });
        };
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await addDoc(collection(db, 'cinemaRooms', roomId, 'signals'), {
          type: 'answer', viewerId, data: { type: answer.type, sdp: answer.sdp }, createdAt: serverTimestamp(),
        });
        const iceQ = query(collection(db, 'cinemaRooms', roomId, 'signals'),
          where('type', '==', 'viewer-ice'), where('viewerId', '==', viewerId));
        onSnapshot(iceQ, iceSnap => {
          iceSnap.docChanges().forEach(async ch => {
            if (ch.type === 'added') { try { await pc.addIceCandidate(new RTCIceCandidate(ch.doc.data().data)); } catch {} }
          });
        });
      }
    });
  };

  const createCinemaRoom = async () => {
    if (!cinemaTitleInput.trim() || !myProfile) return;
    const roomRef = await addDoc(collection(db, 'cinemaRooms'), {
      hostId: uid, hostNickname: myProfile.nickname, hostAvatar: myProfile.avatar,
      hostColor: myProfile.color, hostAvatarImage: myProfile.avatarImage || '',
      title: cinemaTitleInput.trim(), isLive: true, createdAt: serverTimestamp(),
    });
    const room = { id: roomRef.id, hostId: uid, title: cinemaTitleInput.trim(), hostNickname: myProfile.nickname, hostAvatar: myProfile.avatar, hostColor: myProfile.color, hostAvatarImage: myProfile.avatarImage || '' };
    setIsHosting(true);
    setActiveCinemaRoom(room);
    setCinemaView('room');
    setShowCreateCinema(false);
    setCinemaTitleInput('');
    commentsUnsubRef.current = onSnapshot(
      query(collection(db, 'cinemaRooms', roomRef.id, 'comments'), orderBy('createdAt')),
      snap => setCinemaComments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    await setDoc(doc(db, 'cinemaRooms', roomRef.id, 'viewers', uid), { nickname: myProfile.nickname, joinedAt: serverTimestamp() });
    viewersUnsubRef.current = onSnapshot(
      collection(db, 'cinemaRooms', roomRef.id, 'viewers'),
      snap => setCinemaViewerCount(snap.size)
    );
  };

  const startHostStream = async () => {
    if (!activeCinemaRoom) return;
    let stream;
    try { stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }); }
    catch { return; }
    setScreenStream(stream);
    setTimeout(() => { if (localVideoRef.current) localVideoRef.current.srcObject = stream; }, 100);
    stream.getVideoTracks()[0].onended = () => leaveCinemaRoom(activeCinemaRoom.id, true);
    startHostSignaling(activeCinemaRoom.id, stream);
  };

  const joinCinemaRoom = async (room) => {
    setActiveCinemaRoom(room);
    setCinemaView('room');
    commentsUnsubRef.current = onSnapshot(
      query(collection(db, 'cinemaRooms', room.id, 'comments'), orderBy('createdAt')),
      snap => setCinemaComments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    await setDoc(doc(db, 'cinemaRooms', room.id, 'viewers', uid), { nickname: myProfile?.nickname || '', joinedAt: serverTimestamp() });
    viewersUnsubRef.current = onSnapshot(
      collection(db, 'cinemaRooms', room.id, 'viewers'),
      snap => setCinemaViewerCount(snap.size)
    );
    if (room.hostId === uid) return;
    const pc = new RTCPeerConnection(ICE_SERVERS);
    myPeerRef.current = pc;
    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
      setTimeout(() => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0]; }, 100);
    };
    pc.onicecandidate = async ({ candidate }) => {
      if (candidate) await addDoc(collection(db, 'cinemaRooms', room.id, 'signals'), {
        type: 'viewer-ice', viewerId: uid, data: candidate.toJSON(), createdAt: serverTimestamp(),
      });
    };
    const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);
    await addDoc(collection(db, 'cinemaRooms', room.id, 'signals'), {
      type: 'offer', viewerId: uid, data: { type: offer.type, sdp: offer.sdp }, createdAt: serverTimestamp(),
    });
    const answerQ = query(collection(db, 'cinemaRooms', room.id, 'signals'),
      where('type', '==', 'answer'), where('viewerId', '==', uid));
    const answerUnsub = onSnapshot(answerQ, async snap => {
      if (snap.empty || pc.remoteDescription) return;
      await pc.setRemoteDescription(new RTCSessionDescription(snap.docs[0].data().data));
      answerUnsub();
    });
    const hostIceQ = query(collection(db, 'cinemaRooms', room.id, 'signals'),
      where('type', '==', 'host-ice'), where('viewerId', '==', uid));
    onSnapshot(hostIceQ, snap => {
      snap.docChanges().forEach(async ch => {
        if (ch.type === 'added') { try { await pc.addIceCandidate(new RTCIceCandidate(ch.doc.data().data)); } catch {} }
      });
    });
  };

  const leaveCinemaRoom = async (roomId, asHost = false) => {
    if (myPeerRef.current) { myPeerRef.current.close(); myPeerRef.current = null; }
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};
    if (screenStream) { screenStream.getTracks().forEach(t => t.stop()); }
    setScreenStream(null);
    setRemoteStream(null);
    const rid = roomId || activeCinemaRoom?.id;
    if (rid) { try { await deleteDoc(doc(db, 'cinemaRooms', rid, 'viewers', uid)); } catch {} }
    if (asHost) {
      if (rid) { try { await deleteDoc(doc(db, 'cinemaRooms', rid)); } catch {} }
    }
    if (signalUnsubRef.current) { signalUnsubRef.current(); signalUnsubRef.current = null; }
    if (commentsUnsubRef.current) { commentsUnsubRef.current(); commentsUnsubRef.current = null; }
    if (viewersUnsubRef.current) { viewersUnsubRef.current(); viewersUnsubRef.current = null; }
    setIsHosting(false);
    setActiveCinemaRoom(null);
    setCinemaComments([]);
    setCinemaInput('');
    setCinemaViewerCount(0);
    setCinemaView('list');
  };

  const sendCinemaComment = async () => {
    if (!cinemaInput.trim() || !activeCinemaRoom || !myProfile) return;
    const text = cinemaInput.trim();
    setCinemaInput('');
    await addDoc(collection(db, 'cinemaRooms', activeCinemaRoom.id, 'comments'), {
      userId: uid, userNickname: myProfile.nickname, userAvatar: myProfile.avatar,
      userColor: myProfile.color, text, createdAt: serverTimestamp(),
    });
  };

  if (!myProfile) {
    return (
      <LoadingState
        label="載入中..."
        error={myProfileError || undefined}
        onRetry={myProfileError ? () => window.location.reload() : undefined}
      />
    );
  }

  const activeFriendProfile = activeFriendId ? friendProfiles[activeFriendId] : null;
  const myFriends = (myProfile.friends || [])
    .map(fid => friendProfiles[fid])
    .filter(f => f && (!searchQuery || f.nickname.toLowerCase().includes(searchQuery.toLowerCase())));
  const pendingInCount = (myProfile.pendingIn || []).length;
  const activeGroup = activeGroupId ? myGroups.find(g => g.id === activeGroupId) : null;

  // Mobile nav: which top-level destination is currently "drilled into".
  // showImageEditor is split out of inMoreTool since it now has its own tab
  // bar entry — reaching it should highlight "圖片編輯", not "更多".
  const inMoreTool = showLeaderboard || showCinema || showVocab || showSpanish || showSpanishCourse ||
    showCustomVocab || showDict || showSpanishPron || showSpanishGrammar || showSpanishVerbs ||
    showEnglishPron || showIeltsBand4 || showAiChat || showDocConvert || showAiCompanion || showUpgrade;
  const inTool = inMoreTool || showImageEditor;
  const inThread = !!activeFriendId || !!activeGroupId;

  // 手機版側邊抽屜：從內容區「中間」開始跟手拖曳，不是邊緣手勢。
  // 這裡刻意不做「只有貼著螢幕左邊才觸發」的邊緣手勢——iPhone Safari 把貼著螢幕
  // 最左邊（大約 20px 內）的右滑當成瀏覽器「返回上一頁」，如果我們的拖曳判定也
  // 用同一塊起手區，兩邊會搶手勢，使用者感覺起來就像「右滑變成返回上一頁」。
  // 所以改成：起手點只要不是落在最左邊那條窄窄的安全帶（交給 Safari 自己處理），
  // 聊天內容區中間、任何地方都可以按著往右拖出抽屜。
  const DRAWER_EDGE_SAFE_ZONE = 24; // 起手點落在螢幕最左邊 <=24px 一律不接手（讓給 Safari 的返回手勢）
  const DRAWER_DEAD_ZONE = 12;      // 手指移動要超過這個距離才判斷方向
  const DRAWER_DIRECTION_RATIO = 1.4; // |dx| 要大於 |dy| 的這個倍數才鎖定成水平拖曳
  const DRAWER_OPEN_PROGRESS = 0.5;  // 放開時，拖曳超過抽屜寬度的 50% 就視為「要打開」
  const DRAWER_OPEN_VELOCITY = 0.45; // px/ms，快速右滑（即使沒拖過 50%）也視為「要打開」
  const DRAWER_CLOSE_VELOCITY = -0.45; // 快速左滑視為「要關閉」
  // 這些元素上按著不應該啟動抽屜手勢（輸入、按鈕、連結……），避免誤觸打字/點擊。
  const DRAWER_SWIPE_EXCLUDE_SELECTOR = 'input, textarea, button, a, select, [data-disable-drawer-swipe="true"]';

  // 直接寫 DOM style，不透過 setState／re-render，確保每一幀都跟手指同步。
  function applyDrawerTransform(dragX, drawerWidth, animate) {
    const progress = drawerWidth ? Math.max(0, Math.min(1, dragX / drawerWidth)) : 0;
    const transition = animate ? "transform 240ms cubic-bezier(0.22,1,0.36,1)" : "none";
    if (sidebarElRef.current) {
      sidebarElRef.current.style.transition = transition;
      sidebarElRef.current.style.transform = `translateX(${dragX - drawerWidth}px)`;
    }
    if (mainElRef.current) {
      mainElRef.current.style.transition = transition;
      mainElRef.current.style.transform = `translateX(${dragX}px)`;
    }
    if (backdropElRef.current) {
      backdropElRef.current.style.transition = animate ? "opacity 240ms ease" : "none";
      backdropElRef.current.style.opacity = String(progress * 0.35);
      backdropElRef.current.style.pointerEvents = progress > 0.02 ? "auto" : "none";
    }
  }

  function measuredDrawerWidth() {
    return sidebarElRef.current ? sidebarElRef.current.getBoundingClientRect().width : Math.min(window.innerWidth * 0.84, 320);
  }

  // 拖曳結束（或非拖曳觸發，例如點 tab／選單項目）收斂到最終開/關狀態，
  // 附帶 240ms 的 ease-out 吸附動畫；只有這裡才會出現 CSS transition。
  function settleDrawer(open) {
    const w = measuredDrawerWidth();
    applyDrawerTransform(open ? w : 0, w, true);
    setSidebarOpen(open);
    if (open) {
      try { window.history.pushState({ evonDrawer: true }, ""); } catch (_) {}
    }
  }

  function handleShellPointerDown(e) {
    if (!isMobile || (e.pointerType === "mouse" && e.button !== 0)) return;
    // 關閉狀態下，起手點貼著螢幕最左邊那條窄窄的安全帶——讓給 Safari 自己的返回
    // 手勢，不要跟它搶（這條就是使用者反映「右滑變成返回上一頁」的根本原因）。
    // 除此之外，聊天內容區中間、任何地方都可以是起手點。
    if (!sidebarOpen && e.clientX < DRAWER_EDGE_SAFE_ZONE) return;
    // 輸入框、按鈕、連結等互動元件上按著，不要啟動抽屜手勢（否則會吃掉點擊/打字）。
    if (e.target.closest && e.target.closest(DRAWER_SWIPE_EXCLUDE_SELECTOR)) return;
    dragStateRef.current = {
      dragging: true, pointerId: e.pointerId,
      startX: e.clientX, startY: e.clientY,
      lastX: e.clientX, startTime: performance.now(), lastTime: performance.now(),
      locked: null, wasOpen: sidebarOpen, drawerWidth: measuredDrawerWidth(),
    };
  }
  function handleShellPointerMove(e) {
    const st = dragStateRef.current;
    if (!st.dragging || e.pointerId !== st.pointerId) return;
    const deltaX = e.clientX - st.startX;
    const deltaY = e.clientY - st.startY;
    if (st.locked === null) {
      if (Math.abs(deltaX) <= DRAWER_DEAD_ZONE && Math.abs(deltaY) <= DRAWER_DEAD_ZONE) return;
      // 沒開著的時候，這個手勢只負責「打開」，所以只鎖定向右的水平拖曳；
      // 已經開著時，左右都要能拖（左拖收回、右拖沒意義但不影響）。
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * DRAWER_DIRECTION_RATIO;
      const isRightward = deltaX > 0;
      st.locked = isHorizontal && (st.wasOpen || isRightward);
      if (!st.locked) { st.dragging = false; return; }
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    }
    e.preventDefault();
    const dragX = st.wasOpen
      ? Math.max(0, Math.min(st.drawerWidth + deltaX, st.drawerWidth))
      : Math.max(0, Math.min(deltaX, st.drawerWidth));
    st.currentDragX = dragX;
    st.lastX = e.clientX;
    st.lastTime = performance.now();
    applyDrawerTransform(dragX, st.drawerWidth, false);
  }
  function handleShellPointerEnd(e) {
    const st = dragStateRef.current;
    if (!st.dragging || e.pointerId !== st.pointerId) return;
    st.dragging = false;
    if (!st.locked) return;
    const dragX = st.currentDragX ?? (st.wasOpen ? st.drawerWidth : 0);
    const progress = st.drawerWidth ? dragX / st.drawerWidth : 0;
    const totalMs = Math.max(1, st.lastTime - st.startTime);
    const velocity = (st.lastX - st.startX) / totalMs; // px/ms，正值＝向右
    let open;
    if (velocity > DRAWER_OPEN_VELOCITY) open = true;
    else if (velocity < DRAWER_CLOSE_VELOCITY) open = false;
    else open = progress >= DRAWER_OPEN_PROGRESS;
    settleDrawer(open);
  }

  const leaderboard = Object.values(
    donations.reduce((acc, d) => {
      if (!acc[d.userId]) acc[d.userId] = { userId: d.userId, userNickname: d.userNickname, userAvatar: d.userAvatar, userColor: d.userColor, userAvatarImage: d.userAvatarImage, total: 0 };
      acc[d.userId].total += (d.amount || 0);
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);

  // 本頁筆記：右側日曆下方的筆記格，依目前顯示的西語頁面決定 key/標題。
  // SpanishCourseRoom 會用 onContextChange 回報目前的關卡，取得更細的 key。
  let activeSpanishNotes = null;
  if (showSpanishCourse) activeSpanishNotes = spanishCourseNoteContext || { key: "spanish-course-home", title: "西語 A1 路線" };
  else if (showSpanishPron) activeSpanishNotes = { key: "spanish-pron", title: "西語發音" };
  else if (showSpanishGrammar) activeSpanishNotes = { key: "spanish-grammar", title: "西語文法" };
  else if (showSpanishVerbs) activeSpanishNotes = { key: "spanish-verbs", title: "西語動詞變位表" };
  else if (showDict) activeSpanishNotes = { key: "spanish-dict", title: "西語字典" };
  else if (showSpanish) activeSpanishNotes = { key: "spanish-home", title: "西班牙語學習" };

  // 原本分在「更多功能／英語學習／西班牙語」三個資料夾裡的項目全部攤平出來，
  // 跟排行榜/行事曆/自定詞彙/字典一起放進同一份可拖曳排序清單（key → JSX），
  // 實際渲染順序交給 sidebarLayout.layout 決定。定義在這裡（不是側欄自己的
  // IIFE 裡）是因為資料夾內容現在是獨立的浮動面板，跟側欄本身的清單不是
  // 同一個圖層，兩邊都要能用同一份 topItems。
  const topItems = {
    leaderboard: (
      <NavItem icon="🏆" iconBg="linear-gradient(135deg,#f59e0b,#fbbf24,#d97706)" label="排行榜" sublabel="積分排名"
        active={showLeaderboard} onClick={() => { resetAllViews(); setShowLeaderboard(true); }} />
    ),
    calendar: (
      <NavItem icon="📅" iconBg="linear-gradient(135deg,#0891b2,#0e7490)" label="行事曆" sublabel="日曆備忘錄"
        active={showCalendar} onClick={() => { resetAllViews(); setShowCalendar(true); }} />
    ),
    videoHub: (
      <NavItem icon="📺" iconBg="linear-gradient(135deg,#dc2626,#7f1d1d)" label="影片" sublabel="搜尋創作者頻道"
        active={showVideoHub} onClick={() => { resetAllViews(); setShowVideoHub(true); }} />
    ),
    upgrade: (
      <NavItem icon="👑" iconBg="linear-gradient(135deg,#7c3aed,#4338ca)" label="升級會員" sublabel="解鎖完整 AI 體驗"
        active={showUpgrade} onClick={() => { resetAllViews(); setShowUpgrade(true); }} />
    ),
    cinema: (
      <NavItem icon="🎬" iconBg="linear-gradient(135deg,var(--accent-hover),#2563eb)" label="電影院" sublabel="同步觀看影片"
        active={showCinema} onClick={() => { resetAllViews(); setShowCinema(true); }} />
    ),
    imageEditor: (
      <NavItem icon="🖼️" iconBg="linear-gradient(135deg,#0891b2,#0e7490)" label="圖片編輯" sublabel="裁剪・濾鏡・貼圖"
        active={showImageEditor} onClick={() => { resetAllViews(); setShowImageEditor(true); }} />
    ),
    aiChat: (
      <NavItem icon="🤖" iconBg="linear-gradient(135deg,#4f46e5,#7c3aed)" label="AI 助手" sublabel="有問題都可以問我"
        active={showAiChat} onClick={() => { resetAllViews(); setShowAiChat(true); }} />
    ),
    docConvert: (
      <NavItem icon="🔄" iconBg="linear-gradient(135deg,#0d9488,#0891b2)" label="文檔轉換" sublabel="圖片・影音格式互轉"
        active={showDocConvert} onClick={() => { resetAllViews(); setShowDocConvert(true); }} />
    ),
    aiCompanion: (
      <NavItem icon="💞" iconBg="linear-gradient(135deg,#db2777,#9333ea)" label="AI 夥伴" sublabel={myProfile?.hasAiCompanion ? "語音陪伴" : "付費解鎖"}
        active={showAiCompanion} onClick={() => { resetAllViews(); setShowAiCompanion(true); }} />
    ),
    englishPron: (
      <NavItem compact icon="🔤" iconBg="linear-gradient(135deg,#1e3a5f,#3b82f6)" label="英語發音" sublabel="音標・母音・子音"
        active={showEnglishPron} onClick={() => { resetAllViews(); setShowEnglishPron(true); }} />
    ),
    ieltsBand4: (
      <NavItem compact icon="🎯" iconBg="linear-gradient(135deg,#1e3a1e,#6366f1)" label="IELTS 4.0 入門" sublabel="詞彙・聽力・口說"
        active={showIeltsBand4} onClick={() => { resetAllViews(); setShowIeltsBand4(true); }} />
    ),
    vocab: (
      <NavItem icon="📚" iconBg="linear-gradient(135deg,#065f46,#10b981)" label="IELTS 詞彙" sublabel="IELTS 單字練習"
        active={showVocab} onClick={() => { resetAllViews(); setShowVocab(true); }} />
    ),
    spanish: (
      <NavItem icon="🇪🇸" iconBg="linear-gradient(135deg,#7c1d1d,#dc2626)" label="西班牙語學習" sublabel="CEFR A1/A2"
        active={showSpanish} onClick={() => { resetAllViews(); setShowSpanish(true); }} />
    ),
    spanishCourse: (
      <NavItem compact icon="🗺️" iconBg="linear-gradient(135deg,#1e1b4b,#6366f1)" label="西語 A1 路線" sublabel="初學者情境課程"
        active={showSpanishCourse} onClick={() => { resetAllViews(); setShowSpanishCourse(true); }} />
    ),
    spanishPron: (
      <NavItem compact icon="🔤" iconBg="linear-gradient(135deg,#7c1d1d,#b91c1c)" label="西語發音" sublabel="母音 · 子音 · 重音"
        active={showSpanishPron} onClick={() => { resetAllViews(); setShowSpanishPron(true); }} />
    ),
    spanishGrammar: (
      <NavItem compact icon="📐" iconBg="linear-gradient(135deg,#14532d,#16a34a)" label="西語文法" sublabel="ser/estar · 代詞 · 動詞"
        active={showSpanishGrammar} onClick={() => { resetAllViews(); setShowSpanishGrammar(true); }} />
    ),
    spanishVerbs: (
      <NavItem compact icon="🧩" iconBg="linear-gradient(135deg,#7c2d12,#dc2626)" label="西語動詞變位" sublabel="完整變位查詢"
        active={showSpanishVerbs} onClick={() => { resetAllViews(); setShowSpanishVerbs(true); }} />
    ),
    customVocab: (
      <NavItem icon="✏️" iconBg="linear-gradient(135deg,var(--accent-hover),#7c3aed)" label="自定詞彙" sublabel="建立個人單字本"
        active={showCustomVocab} onClick={() => { resetAllViews(); setShowCustomVocab(true); }} />
    ),
    dict: (
      <NavItem icon="📖" iconBg="linear-gradient(135deg,#0f2e1c,#166534)" label="字典" sublabel="英・西・法 A-Z"
        active={showDict} onClick={() => { resetAllViews(); setShowDict(true); }} />
    ),
  };
  const sidebarItemPadding = { padding: "0 10px 6px" };

  return (
    <>
      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        .fb:hover { background: var(--accent-hover) !important; }
        .fb.act  { background: var(--accent-active) !important; box-shadow: var(--glow-shadow); }
        .sb:hover:not(:disabled) { background: #2563eb !important; }

        /* Groups / Friends sidebar rows — sizing lives here (with a mobile
           override below) instead of isMobile ? {} : {} inline style pairs,
           since the two variants render identical markup and only differ
           in size/spacing. */
        .fb {
          width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 10px;
          border-radius: var(--radius-md); border: none; background: transparent; color: var(--text);
          cursor: pointer; text-align: left; transition: background 0.15s; margin-bottom: 2px;
        }
        .cr-fb-icon {
          /* Group icons only (friends use the separate circular AvatarImg
             component) — Discord-style "squircle": a square with soft
             rounded corners instead of a full circle. 30% scales with the
             icon's own size so the 48px mobile variant below stays the
             same shape, not just a fixed px radius that would look
             proportionally sharper at the smaller desktop size. */
          width: 36px; height: 36px; border-radius: 30%;
          background: linear-gradient(135deg,var(--text-dim),var(--border));
          display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;
        }
        .cr-fb-name { font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cr-fb-sub  { font-size: 11px; color: var(--text-faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cr-nav-hdr { padding: 0 12px 4px; display: flex; justify-content: space-between; align-items: center; }
        .cr-nav-hdr-label { font-size: 11px; font-weight: 600; color: var(--text-dim); letter-spacing: 0.06em; text-transform: uppercase; }
        .cr-nav-icon-btn {
          background: var(--border); border: none; border-radius: var(--radius-sm); padding: 3px 8px;
          color: var(--text-muted); cursor: pointer; font-size: 14px;
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

        /* ── Global overflow guard ── */
        html, body { overflow-x: hidden; }
        #__next { overflow-x: hidden; }

        /* ── Mobile topbar: hidden on desktop ── */
        .cr-mobile-topbar { display: none; }

        /* ── Mobile drawer backdrop: hidden on desktop ── */
        .cr-sidebar-backdrop { display: none; }

        /* ── Calendar overlay ── */
        .cr-cal {
          flex-shrink: 0;
          border: var(--col-border, none);
          border-radius: var(--col-radius, 0px);
          box-shadow: var(--col-shadow, none);
          backdrop-filter: var(--col-blur, none);
          -webkit-backdrop-filter: var(--col-blur, none);
        }

        /* ── Floating-panel gap between sidebar / center column / calendar
           (shadow-window only — every other theme's --panel-gap defaults to
           0px, so .cr-shell stays one edge-to-edge card exactly as before). */
        .cr-shell { gap: var(--panel-gap, 0px); }
        .cr-main { gap: var(--panel-gap, 0px); }

        /* Chat message panel — floating "window" for shadow-window, no-op
           elsewhere (margin/radius/glow all default to 0/none). */
        .cr-chat-panel {
          margin: var(--chatpanel-margin, 0px);
          border-radius: var(--chatpanel-radius, 0px);
          border: var(--col-border, none);
          box-shadow: var(--col-shadow, none);
          background-color: var(--force-panel-bg, transparent);
          background-image: var(--chatpanel-glow, none), var(--chat-world-tint, transparent), var(--chat-world-bg, none);
          backdrop-filter: var(--force-panel-blur, none);
          -webkit-backdrop-filter: var(--force-panel-blur, none);
          position: relative;
        }

        /* ── Chat "世界" background skin (lib/chatWorlds.js) ──
           The photo is painted exactly once, as <body>'s own background (see
           theme.css) — every panel here just goes fully transparent
           (var(--chat-world-transparent) resolves to literal "transparent"
           only while a world is selected; unset otherwise, so each falls
           back to its own normal opaque color) so that single copy shows
           through everywhere uniformly. No opacity/filter/backdrop-filter
           anywhere in this chain — text/icons/buttons are never touched,
           only background-color. */
        .cr-sidebar {
          background-color: var(--force-panel-bg, var(--chat-world-transparent, var(--panel-alt)));
          background-image: var(--chat-world-transparent, var(--panel-gradient-img, none));
          backdrop-filter: var(--force-panel-blur, none);
          -webkit-backdrop-filter: var(--force-panel-blur, none);
        }
        .cr-chat-header, .cr-input-bar {
          background-color: var(--force-panel-bg, var(--chat-world-transparent, var(--panel-alt)));
          background-image: var(--chat-world-transparent, var(--panel-gradient-img, none));
          backdrop-filter: var(--force-panel-blur, none);
          -webkit-backdrop-filter: var(--force-panel-blur, none);
        }
        .cr-chat-header {
          margin: var(--toolbar-panel-margin, 0px);
          border-radius: var(--toolbar-panel-radius, 0px);
          border: var(--col-border, none);
          box-shadow: var(--col-shadow, none);
        }
        .cr-input-bar {
          margin: var(--inputbar-panel-margin, 0px);
          border-radius: var(--inputbar-panel-radius, 0px);
          border: var(--col-border, none);
          box-shadow: var(--col-shadow, none);
          min-height: var(--inputbar-height, auto);
        }

        @media (max-width: 767px) {
          /* Prevent iOS Safari auto-zoom on input focus (needs >=16px) */
          input, textarea, select { font-size: 16px !important; }

          /* Shell fills full screen */
          .cr-shell {
            margin: 0 !important;
            height: 100dvh !important;
            border-radius: 0 !important;
            flex-direction: column !important;
          }

          /* Sidebar (聊天分頁): iOS 風格抽屜，position:fixed 疊在畫面上，
             初始關閉在螢幕外；開關/拖曳位置一律由 JS 直接寫 transform（見
             applyDrawerTransform／settleDrawer），這裡只設定尺寸和層級。 */
          .cr-sidebar {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            bottom: 0 !important;
            width: min(84vw, 320px) !important;
            max-width: min(84vw, 320px) !important;
            height: 100dvh !important;
            z-index: 430 !important;
            border-right: none !important;
            box-shadow: 4px 0 24px rgba(0,0,0,0.18);
            padding-top: env(safe-area-inset-top) !important;
            transform: translateX(-100%);
          }

          /* Backdrop: dims + catches taps to close; opacity/pointer-events driven by JS during drag */
          .cr-sidebar-backdrop {
            display: block !important;
            position: fixed;
            inset: 0;
            background: #000;
            opacity: 0;
            pointer-events: none;
            z-index: 420;
          }

          /* Main area: normal document flow, full width; pushed via JS transform while dragging/open */
          .cr-main {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            /* 沒有 min-height:0，flex 子項目預設 min-height:auto 會撐開超過可用空間，
               導致內容被 .cr-shell 的 overflow:hidden 直接裁掉，而不是自己捲動——
               這是各個「room」（西語課程/字典/大廳訊息等）在手機版滑不動的根本原因。 */
            min-height: 0 !important;
            overflow-x: hidden !important;
            overflow-y: hidden !important;
            touch-action: pan-y;
          }

          /* Mobile topbar shown */
          .cr-mobile-topbar {
            display: flex !important;
            align-items: center;
            gap: 8px;
            min-height: 56px;
            box-sizing: border-box;
            padding: calc(env(safe-area-inset-top) + 10px) 12px 10px;
            background: var(--panel);
            border-bottom: 1px solid var(--border);
            flex-shrink: 0;
          }

          /* Groups / Friends sidebar rows: bigger touch targets, no hover-era transition */
          .fb {
            min-height: 64px; box-sizing: border-box; gap: 12px; padding: 8px 0;
            border-radius: 14px; margin-bottom: 0; transition: none;
          }
          .cr-fb-icon { width: 48px; height: 48px; font-size: 22px; }
          .cr-fb-name { font-size: 16px; }
          .cr-fb-sub  { font-size: 13px; color: var(--text-muted); }
          .cr-nav-hdr { padding: 0 16px; margin-top: 8px; margin-bottom: 6px; }
          .cr-nav-hdr-label { font-size: 13px; font-weight: 700; color: var(--text-muted); letter-spacing: normal; text-transform: none; }
          .cr-nav-icon-btn {
            width: 32px; height: 32px; border-radius: 16px; padding: 0;
            background: var(--panel-alt); border: 1px solid var(--border);
            display: flex; align-items: center; justify-content: center;
          }

          /* Calendar: full-screen overlay */
          .cr-cal {
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100dvh !important;
            z-index: 350 !important;
            transform: translateX(100%);
            transition: transform 0.28s ease;
            overflow: hidden !important;
            display: flex;
            flex-direction: column;
          }
          .cr-cal-open { transform: translateX(0) !important; }

          /* Input areas: safe area padding at bottom */
          .cr-input-bar {
            padding-bottom: calc(env(safe-area-inset-bottom) + 10px) !important;
          }

          /* Prevent any child from causing horizontal scroll */
          .cr-main > * { max-width: 100%; }

          /* Calendar inner: full width on mobile overlay */
          .cal-inner {
            width: 100% !important;
            height: 100% !important;
            border-left: none !important;
            flex: 1 !important;
          }

          /* Comfortable ~44px touch target for icon-only close buttons */
          .cr-close-btn {
            min-width: 44px !important;
            min-height: 44px !important;
            display: flex !important;
            align-items: center;
            justify-content: center;
          }

          /* Modal → bottom sheet */
          .cr-sheet-overlay { align-items: flex-end !important; }
          .cr-sheet {
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 20px 20px 0 0 !important;
            max-height: 80vh !important;
            padding-bottom: calc(20px + env(safe-area-inset-bottom)) !important;
          }

          /* Modal → full-screen */
          .cr-modal-full {
            border-radius: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
          }
        }
      `}</style>

      {showProfile    && <ProfilePage myProfile={myProfile} friendProfiles={friendProfiles} onSave={handleSaveProfile} onClose={() => setShowProfile(false)} />}
      {showFriendSearch && <FriendSearch myUid={uid} myProfile={myProfile} onClose={() => setShowFriendSearch(false)} onSendRequest={handleSendFriendRequest} />}
      {showFriendReqs && <FriendRequests myProfile={myProfile} onAccept={handleAcceptFriend} onDecline={handleDeclineFriend} onClose={() => setShowFriendReqs(false)} />}
      {showCreateGroup && <CreateGroupModal friends={myFriends} onClose={() => setShowCreateGroup(false)} onCreate={handleCreateGroup} />}
      {showDonateModal && <DonateModal myProfile={myProfile} onClose={() => setShowDonateModal(false)} />}
      {showCompanionCreator && <AiCompanionCreator myProfile={myProfile} onClose={() => setShowCompanionCreator(false)} />}

      {/* Right-click context menu */}
      {contextMenu && (
        <div onClick={e => e.stopPropagation()} style={{ position: "fixed", top: Math.min(contextMenu.y, window.innerHeight - 140), left: Math.min(contextMenu.x, window.innerWidth - 170), background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "4px 0", zIndex: 450, minWidth: 160, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
          <Link href={`/profile/${contextMenu.friend.uid}`} onClick={() => setContextMenu(null)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", color: "var(--text)", textDecoration: "none", fontSize: 13 }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--border)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            🔍 查看個人檔案
          </Link>
          <button onClick={() => { setFriendInfo(contextMenu.friend); setContextMenu(null); }}
            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", color: "var(--text)", background: "none", border: "none", textAlign: "left", fontSize: 13, cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--border)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            ℹ️ 個人資料
          </button>
          <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
          <button onClick={() => { setActiveFriendId(contextMenu.friend.uid); setActiveGroupId(null); setShowLeaderboard(false); setContextMenu(null); }}
            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", color: "var(--text)", background: "none", border: "none", textAlign: "left", fontSize: 13, cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--border)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            💬 傳送訊息</button>
        </div>
      )}

      {/* Friend info card */}
      {friendInfo && (
        <div onClick={() => setFriendInfo(null)} className="cr-sheet-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600 }}>
          <div onClick={e => e.stopPropagation()} className="cr-sheet" style={{ background: "var(--panel)", borderRadius: 20, width: 320, maxWidth: "92vw", border: "1px solid var(--border)", overflow: "hidden" }}>
            <div style={{ background: friendInfo.profileBgType === "image" ? undefined : (friendInfo.profileBg || "linear-gradient(135deg,var(--accent-hover),#2d1f6e)"), backgroundImage: friendInfo.profileBgType === "image" ? `url(${friendInfo.profileBg})` : undefined, backgroundSize: "cover", backgroundPosition: "center", height: 80, position: "relative" }}>
              <button onClick={() => setFriendInfo(null)} className="cr-close-btn" style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.4)", border: "none", borderRadius: "50%", width: 28, height: 28, color: "#fff", cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>
            <div style={{ padding: "0 20px 20px", marginTop: -30 }}>
              <AvatarImg avatarImage={friendInfo.avatarImage} avatar={friendInfo.avatar} color={friendInfo.color} size={60} />
              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: "var(--text)" }}>{friendInfo.nickname}</div>
                {friendInfo.signature && <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", marginTop: 2 }}>{friendInfo.signature}</div>}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6, background: `${getStatus(friendInfo.status).color}22`, border: `1px solid ${getStatus(friendInfo.status).color}`, borderRadius: 20, padding: "2px 8px" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: getStatus(friendInfo.status).color, display: "inline-block" }} />
                  <span style={{ fontSize: 11, color: getStatus(friendInfo.status).color, fontWeight: 600 }}>{getStatus(friendInfo.status).label}</span>
                </div>
                {friendInfo.statusText && <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>{friendInfo.statusText}</div>}
                {friendInfo.bio && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 10, lineHeight: 1.6 }}>{friendInfo.bio}</div>}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={() => { setActiveFriendId(friendInfo.uid); setActiveGroupId(null); setShowLeaderboard(false); setFriendInfo(null); }}
                  style={{ flex: 1, background: "var(--accent)", border: "none", borderRadius: "var(--radius-md)", padding: "9px 0", color: "var(--accent-text)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  💬 傳送訊息                </button>
                <Link href={`/profile/${friendInfo.uid}`} onClick={() => setFriendInfo(null)}
                  style={{ flex: 1, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "9px 0", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  🔍 查看檔案
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="cr-shell" ref={shellElRef}
        onPointerDown={handleShellPointerDown} onPointerMove={handleShellPointerMove}
        onPointerUp={handleShellPointerEnd} onPointerCancel={handleShellPointerEnd}
        style={{
        display: "flex",
        position: "relative",
        height: "calc(var(--viewport-h, 100vh) - var(--shell-margin) * 2 - env(safe-area-inset-top) - env(safe-area-inset-bottom))",
        marginTop: "calc(var(--shell-margin) + env(safe-area-inset-top))",
        marginBottom: "calc(var(--shell-margin) + env(safe-area-inset-bottom))",
        marginLeft: "calc(var(--shell-margin) + env(safe-area-inset-left))",
        marginRight: "calc(var(--shell-margin) + env(safe-area-inset-right))",
        // Goes fully transparent while a world is selected (see
        // lib/chatWorlds.js) — this sits directly between <body> (which
        // paints the one shared copy of the photo) and every panel below,
        // so it has to get out of the way for any of them to show it.
        // Otherwise it's exactly the same opaque var(--shell-bg) as before.
        // --force-shell-bg overrides that for 幽影深窗: the gap between the
        // floating panels is meant to read as plain solid background (see
        // the reference mock), not a second, fainter copy of the world
        // photo bleeding through — which was compounding with .cr-main's
        // own identical pass-through below and reading as "no gap at all"
        // once the (dimmed) photo happened to be close in tone to the
        // panels' own glass color.
        background: "var(--force-shell-bg, var(--chat-world-transparent, var(--shell-bg)))",
        color: "var(--text)", fontFamily: "var(--font-body)", overflow: "hidden",
        borderRadius: "var(--shell-radius)", boxShadow: "var(--shell-shadow)",
        backdropFilter: "var(--shell-blur)", WebkitBackdropFilter: "var(--shell-blur)",
      }}>

        {/* 抽屜遮罩：不透明度由拖曳/開關即時控制（applyDrawerTransform），
            點擊時 1:1 關閉抽屜（見下方 onClick）。 */}
        <div ref={backdropElRef} className="cr-sidebar-backdrop"
          onClick={() => settleDrawer(false)} />

        {/* Mobile topbar: back chevron（在聊天串/工具畫面時）+ 標題 + 日曆／設定／登出
            （在聊天列表首頁時）。全部改用 lucide 圖示，跟桌面版共用邏輯、不共用這個
            只在 isMobile 才會顯示的元素本身，所以不會影響桌面版。 */}
        <header className="cr-mobile-topbar">
          {mobileView === null ? (
            <button onClick={() => { if (inTool) { setMobileView('more'); } else { settleDrawer(true); } }} aria-label="開啟選單"
              style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer", padding: 6, margin: "-6px 0", lineHeight: 1, flexShrink: 0, display: "flex" }}>
              <ChevronLeft size={24} />
            </button>
          ) : (
            <div style={{ width: 24, flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 17, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {mobileView === 'more' ? "更多" : activeGroup ? activeGroup.name : activeFriendProfile ? activeFriendProfile.nickname : "Evonchat"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <button onClick={() => setCalendarOpen(true)} aria-label="開啟日曆"
              style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer", padding: 6, lineHeight: 1, display: "flex" }}>
              <CalendarDays size={21} />
            </button>
            <button onClick={() => setShowProfile(true)} aria-label="設定"
              style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer", padding: 6, lineHeight: 1, display: "flex" }}>
              <Settings size={21} />
            </button>
            <button onClick={() => auth.signOut()} aria-label="登出"
              style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer", padding: 6, lineHeight: 1, display: "flex" }}>
              <LogOut size={21} />
            </button>
          </div>
        </header>

        {/* 資料夾 rail：側欄最左邊一條窄欄，只放資料夾圖示（Discord 伺服器欄
            的概念）——「全部功能」＋每個資料夾一個小圖案＋新增資料夾，跟側欄
            本身是獨立的兩塊，收合側欄不會連帶把這條 rail 也藏起來。 */}
        {!isMobile && (
          <div className="cr-folder-rail" style={{
            width: 56, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center",
            gap: 10, padding: "12px 4px", overflowY: "auto", overflowX: "hidden",
          }}>
            <button
              ref={sidebarLayout.registerTop("__home__")}
              onClick={() => sidebarLayout.setActiveFolder(null)}
              title="全部功能"
              style={{
                width: 40, height: 40, borderRadius: sidebarLayout.activeFolderId ? "50%" : "30%",
                border: "none", cursor: "pointer", fontSize: 17, flexShrink: 0,
                background: sidebarLayout.activeFolderId ? "var(--navcard-bg, transparent)" : "linear-gradient(135deg,var(--accent),var(--accent-2))",
                color: sidebarLayout.activeFolderId ? "var(--text-muted)" : "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "border-radius 0.15s",
              }}>
              🏠
            </button>
            {sidebarLayout.layout.filter(e => e.startsWith("folder:")).map(entry => {
              const fid = entry.slice(7);
              const folder = sidebarLayout.folders[fid];
              if (!folder) return null;
              return (
                <LayoutDragWrap key={entry} dragKey={entry} sourceContainer="top" controller={sidebarLayout}>
                  <FolderRailIcon
                    name={folder.name} count={folder.items.length}
                    active={sidebarLayout.activeFolderId === fid}
                    isDropTarget={sidebarLayout.dropTarget?.folderId === fid}
                    onClick={(e) => openFolderPanel(fid, e)}
                  />
                </LayoutDragWrap>
              );
            })}
            <AddFolderRailButton onAdd={(name) => sidebarLayout.addFolder(name)} />
          </div>
        )}

        {/* 資料夾內容浮動面板：跟 rail 上被點的資料夾圖示同高度冒出來，疊在
            側欄上面的獨立圖層（不是側欄清單本身的一部分，兩者分開渲染，這樣
            改資料夾內容不會動到側欄清單原本的排版/捲動狀態）。 */}
        {!isMobile && sidebarLayout.activeFolderId && sidebarLayout.folders[sidebarLayout.activeFolderId] && (() => {
          const L = sidebarLayout;
          const folder = L.folders[L.activeFolderId];
          return (
            <div style={{
              position: "absolute", top: folderPanelTop, left: FOLDER_RAIL_WIDTH + 6,
              width: `var(--sidebar-w-override, ${sidebarWidth}px)`,
              maxHeight: `calc(100% - ${folderPanelTop}px - 16px)`,
              background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
              boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
              backdropFilter: "var(--panel-blur)", WebkitBackdropFilter: "var(--panel-blur)",
              zIndex: 200, display: "flex", flexDirection: "column", overflow: "hidden",
            }}>
              <ActiveFolderHeader
                folder={folder}
                onBack={() => L.setActiveFolder(null)}
                onRename={(name) => L.renameFolder(L.activeFolderId, name)}
                onDelete={() => { if (confirm(`刪除資料夾「${folder.name}」？（裡面的功能會移回外層）`)) L.deleteFolder(L.activeFolderId); }}
              />
              <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
                {folder.items.map(key => (
                  <LayoutDragWrap key={key} dragKey={key} sourceContainer={L.activeFolderId} controller={L} style={sidebarItemPadding}>
                    {topItems[key]}
                  </LayoutDragWrap>
                ))}
                {folder.items.length === 0 && (
                  <div style={{ fontSize: 11, color: "var(--text-faint)", padding: "4px 10px 8px", textAlign: "center" }}>
                    拖曳左側功能方塊到最左邊這個資料夾圖示
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* 側邊欄：桌面版＝常駐側欄（一般 flex 排列）；手機版＝position:fixed 抽屜，
            由 sidebarOpen 狀態＋拖曳時的即時 transform 控制（見 applyDrawerTransform）。
            桌面版另外還有 sidebarCollapsed（收合成寬度 0，跟手機抽屜是兩套獨立機制）。 */}
        <nav ref={sidebarElRef} className="cr-sidebar" aria-label="聊天導覽" aria-hidden={!isMobile && sidebarCollapsed} style={{
          width: (!isMobile && sidebarCollapsed) ? 0 : `var(--sidebar-w-override, ${sidebarWidth}px)`,
          border: (!isMobile && sidebarCollapsed) ? "none" : "var(--col-border, none)",
          borderRight: (!isMobile && sidebarCollapsed) ? "none" : "var(--col-border-right, 1px solid var(--panel))",
          borderRadius: "var(--col-radius, 0px)",
          boxShadow: "var(--col-shadow, none)",
          backdropFilter: "var(--col-blur, none)", WebkitBackdropFilter: "var(--col-blur, none)",
          margin: (!isMobile && sidebarCollapsed) ? 0 : "var(--col-margin, 0px)",
          display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden",
          transition: (isMobile || resizingPanel === "sidebar") ? undefined : "width 0.25s ease, border-color 0.25s ease",
        }}>

          {/* My info — 手機版壓縮高度、拿掉桌面版才有的 ThemeToggle/登出（已移到手機版頂部列） */}
          {isMobile ? (
            <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)" }}>
              <button onClick={() => setShowProfile(true)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}>
                <AvatarImg avatarImage={myProfile.avatarImage} avatar={myProfile.avatar} color={myProfile.color} size={40} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={`/profile/${uid}`} style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: "none", display: "block" }}>
                  {myProfile.nickname}
                </Link>
                <div style={{ fontSize: 13, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {myProfile.signature || myProfile.statusText || getStatus(myProfile.status).label}
                </div>
              </div>
              <ChevronRight size={18} color="var(--text-dim)" style={{ flexShrink: 0 }} />
            </div>
          ) : (
            <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid var(--panel)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => setShowProfile(true)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}>
                  <AvatarImg avatarImage={myProfile.avatarImage} avatar={myProfile.avatar} color={myProfile.color} size={42} />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`/profile/${uid}`} style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: "none", display: "block" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#93c5fd"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--text)"}>
                    {myProfile.nickname}
                  </Link>
                  {myProfile.signature && <div style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: "italic" }}>{myProfile.signature}</div>}
                  {myProfile.statusText && <div style={{ fontSize: 11, color: "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{myProfile.statusText}</div>}
                </div>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <ThemeToggle mode="inline" onOpenProfile={() => setShowProfile(true)}
                    msgFontSize={msgFontSize} onChangeMsgFontSize={setMsgFontSize}
                    onResetMsgFontSize={() => { setMsgFontSize(DEFAULT_MSG_FONT_SIZE); resetPanelWidths(); }} />
                </div>
              </div>
            </div>
          )}

          {/* Scrollable nav area */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>

          {/* Friend request banner */}
          {pendingInCount > 0 && (
            <button onClick={() => setShowFriendReqs(true)}
              style={isMobile
                ? { margin: "8px 16px 0", display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#dc2626,#b91c1c)", border: "none", borderRadius: 14, padding: "10px 12px", color: "#fff", cursor: "pointer", width: "calc(100% - 32px)", textAlign: "left" }
                : { margin: "8px 10px 0", display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#dc2626,#b91c1c)", border: "none", borderRadius: "var(--radius-md)", padding: "10px 12px", color: "#fff", cursor: "pointer", width: "calc(100% - 20px)", textAlign: "left" }}>
              <span style={{ fontSize: 18 }}>🔔</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>你有 {pendingInCount} 個好友請求</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>點擊查看並處理</div>
              </div>
            </button>
          )}

          {/* Friend search box */}
          {isMobile ? (
            <div style={{ padding: "12px 16px 8px" }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <Search size={16} style={{ position: "absolute", left: 14, color: "var(--text-dim)", pointerEvents: "none" }} />
                <input type="text" placeholder="搜尋好友..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: "100%", height: 44, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, padding: "0 14px 0 38px", color: "var(--text)", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
          ) : (
            <div style={{ padding: "10px 12px 6px", display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                <Search size={15} style={{ position: "absolute", left: "calc(var(--search-icon-left, 24px))", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)", pointerEvents: "none", display: "var(--search-icon-display, none)" }} />
                <input type="text" placeholder="搜尋好友..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: "100%", height: "var(--search-height, auto)", background: "var(--inputfield-bg, var(--panel))", border: "1px solid var(--border)", borderRadius: "var(--search-radius, var(--radius-md))", padding: "var(--search-padding, 7px 12px 7px 12px)", color: "var(--text)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <button onClick={() => setShowFriendSearch(true)} title="新增好友"
                style={{
                  width: "var(--search-height, 34px)", height: "var(--search-height, 34px)", flexShrink: 0, boxSizing: "border-box",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "var(--toolbar-btn-bg, var(--panel-alt))", border: "1px solid var(--border)", borderRadius: "var(--search-radius, var(--radius-md))",
                  color: "var(--text-muted)", cursor: "pointer",
                }}>
                <Plus size={16} />
              </button>
            </div>
          )}

          {/* Feed link + Hall button — 手機版統一成同一種「聊天列表卡片」樣式 */}
          {isMobile ? (
            <div style={{ padding: "4px 16px 0" }}>
              <button onClick={() => { resetAllViews(); setShowFeed(true); if (isMobile) settleDrawer(false); }}
                style={{ width: "100%", minHeight: 64, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderRadius: 14, border: "none", background: showFeed ? "var(--accent-active)" : "transparent", color: "var(--text)", cursor: "pointer", textAlign: "left" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#ec4899,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Newspaper size={22} color="#fff" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>動態消息</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>查看好友動態</div>
                </div>
              </button>
              {(() => {
                const hallActive = !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showVocab && !showSpanish && !showCustomVocab && !showDict && !frenchView && !showSpanishPron && !showSpanishGrammar && !showSpanishVerbs && !showEnglishPron && !showIeltsBand4 && !showFeed && !showImageEditor && !showAiChat && !showDocConvert && !showAiCompanion && !showUpgrade && !showCalendar && !showVideoHub;
                return (
                  <button onClick={() => { resetAllViews(); if (isMobile) settleDrawer(false); }}
                    style={{ width: "100%", minHeight: 64, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderRadius: 14, border: "none", background: hallActive ? "var(--accent-active)" : "transparent", color: "var(--text)", cursor: "pointer", textAlign: "left" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,var(--accent-2),#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <MessageCircle size={22} color="#fff" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}># 公共大廳</div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>和大家聊天吧</div>
                    </div>
                  </button>
                );
              })()}
            </div>
          ) : (
            <>
              {/* Feed view */}
              <div style={{ padding: "4px 10px 0" }}>
                <NavItem icon="📰" iconBg="linear-gradient(135deg,#ec4899,#f59e0b)" label="動態消息" sublabel="查看好友動態"
                  active={showFeed}
                  onClick={() => { resetAllViews(); setShowFeed(true); }} />
              </div>

              {/* Hall button */}
              <div style={{ padding: "4px 10px 0" }}>
                <NavItem icon="💬" iconBg="linear-gradient(135deg,var(--accent-2),#a855f7)" label="# 公共大廳" sublabel="和大家聊天吧"
                  active={!activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showVocab && !showSpanish && !showCustomVocab && !showDict && !frenchView && !showSpanishPron && !showSpanishGrammar && !showSpanishVerbs && !showEnglishPron && !showIeltsBand4 && !showFeed && !showImageEditor && !showAiChat && !showDocConvert && !showAiCompanion && !showUpgrade && !showCalendar && !showVideoHub}
                  onClick={() => { resetAllViews(); }} />
              </div>
            </>
          )}

          {!isMobile && (() => {
            // 資料夾內容現在是側欄外面獨立的浮動面板（.cr-folder-panel，見下面），
            // 跟這裡的主清單不是同一個圖層——這裡永遠只顯示「沒被收進資料夾」
            // 的功能方塊，不會因為選了某個資料夾就整個換掉內容。
            const L = sidebarLayout;
            const visibleKeys = L.layout.filter(e => !e.startsWith("folder:"));
            return (
              <>
                {visibleKeys.map(key => (
                  <LayoutDragWrap key={key} dragKey={key} sourceContainer="top" controller={L} style={sidebarItemPadding}>
                    {topItems[key]}
                  </LayoutDragWrap>
                ))}
                <LayoutDragGhost controller={L} topItems={topItems} />
              </>
            );
          })()}

          {/* Groups section — desktop 版群組改用 .cr-sidebar 外面那條 Discord 風格
              直排 icon 欄（見 .cr-shell 內、cr-main 前面），這裡的文字列表只在
              手機版保留（沒有空間再放一條獨立的 icon 欄）。 */}
          {isMobile && (
            <>
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
                <button key={group.id} onClick={() => { resetAllViews(); setActiveGroupId(group.id); settleDrawer(false); }}
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
            </>
          )}

          {/* Friends header + list — 桌面版好友移到右欄（.cr-cal，跟群組放一起），
              這裡只在手機版保留（手機沒有右欄的概念）。 */}
          {isMobile && (
            <>
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

          {/* Friend list */}
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
                <button key={friend.uid} onClick={() => { if (longPressFiredRef.current) { longPressFiredRef.current = false; return; } resetAllViews(); setActiveFriendId(friend.uid); settleDrawer(false); }}
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
            </>
          )}
          </div>
        </nav>

        {/* 側欄寬度拖曳把手：只在展開狀態顯示，雙擊復原成預設寬度。 */}
        {!isMobile && !sidebarCollapsed && (
          <div
            onMouseDown={e => startPanelResize(e, "sidebar")}
            onDoubleClick={() => resetPanelWidth("sidebar")}
            title="拖曳調整寬度（雙擊復原預設）"
            style={{
              // shadow-window 取消寬度拖曳：--resize-handle-display 設為 none
              // 讓這個把手整個退出 flex 排列，改由 .cr-shell 的 gap（--panel-gap）
              // 單獨決定側欄與主內容之間的間距，不再是「gap + 把手」疊加。
              display: "var(--resize-handle-display, block)",
              width: 6, flexShrink: 0, cursor: "col-resize",
              background: resizingPanel === "sidebar" ? "var(--accent)" : "transparent",
              marginLeft: -3, marginRight: -3, zIndex: 30, position: "relative",
            }}
          />
        )}

        {/* 桌面版收合/展開開關：故意當 cr-sidebar 的 sibling（不是它的子元素），
            這樣 nav 收合到寬度 0、overflow:hidden 裁掉內部內容時，這顆按鈕不會被
            一起裁掉——收合後它剛好貼著畫面左邊界，同一顆鈕兼作「展開入口」，
            不用再另外做一個 edge 按鈕。手機版有自己的抽屜開關（cr-mobile-topbar
            的漢堡鈕），這裡不重複顯示。 */}
        {!isMobile && (
          <button
            onClick={() => setSidebarCollapsed(v => !v)}
            title={sidebarCollapsed ? "展開導覽列" : "收合導覽列"}
            aria-label={sidebarCollapsed ? "展開導覽列" : "收合導覽列"}
            style={{
              // top:74 落在「大頭貼/名字/設定齒輪」那一列下方——原本 top:16 跟
              // 設定齒輪（在同一列右側、y 範圍差不多）幾乎疊在一起，往下移到
              // 可捲動導覽區塊剛開始的地方，兩顆按鈕才不會擠在同一個角落。
              position: "absolute", top: 74,
              left: FOLDER_RAIL_WIDTH + (sidebarCollapsed ? 4 : sidebarWidth - 12),
              zIndex: 40,
              width: 28, height: 28, borderRadius: "50%",
              background: "var(--panel)", border: "1px solid var(--border)",
              color: "var(--text-muted)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "var(--card-shadow)",
              transition: resizingPanel === "sidebar" ? undefined : "left 0.25s ease",
            }}>
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}

        {/* 主要區域：一般文件流佈局；手機版拖曳抽屜時用 ref 直接位移（applyDrawerTransform），
            跟 sidebar 同步、零延遲；抽屜關閉時固定在 translateX(0)。 */}
        <main ref={mainElRef} className="cr-main"
          style={{
            flex: 1, display: (isMobile && mobileView === 'more') ? "none" : "flex", flexDirection: "column", minWidth: 0, minHeight: 0,
            // Same reasoning as .cr-shell above, including --force-shell-bg.
            background: "var(--force-shell-bg, var(--chat-world-transparent, var(--bg)))",
          }}>

          {/* Feed view — embedded so switching here never leaves this SPA.
              Clicking a post author swaps this pane's content for an inline
              ProfileView instead of navigating to /profile/[uid], so that
              never leaves the SPA either. */}
          {showFeed && !activeFriendId && !activeGroupId && !showCalendar && !showVideoHub && (
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              {viewProfileUid ? (
                <ProfileView uid={viewProfileUid} embedded
                  onClose={() => setViewProfileUid(null)}
                  onOpenProfile={setViewProfileUid} />
              ) : (
                <FeedApp user={user} embedded onOpenProfile={setViewProfileUid} />
              )}
            </div>
          )}

          {/* Calendar view — 原本是右欄永遠顯示的東西，現在改成左側可切換的
              一般功能，跟排行榜等其他頁面同一套 showX 模式；右欄（.cr-cal）
              改放群組跟好友。 */}
          {showCalendar && !activeFriendId && !activeGroupId && !showFeed && !showLeaderboard && !showCinema && !showVocab && !showSpanish && !showSpanishCourse && !showCustomVocab && !showDict && !frenchView && !showSpanishPron && !showSpanishGrammar && !showSpanishVerbs && !showEnglishPron && !showIeltsBand4 && !showImageEditor && !showAiChat && !showDocConvert && !showAiCompanion && !showUpgrade && !showVideoHub && (
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              <div style={{ maxWidth: 480, margin: "0 auto", width: "100%" }}>
                <CalendarMemo uid={uid} />
              </div>
            </div>
          )}

          {/* 影片瀏覽入口：videoHubUid 沒有值時是搜尋/熱門頻道清單（VideoHub），
              點了某個頻道之後換成 ChannelProfileView——YouTube 頻道風格的獨立
              版面（橫幅+訂閱+分頁+影片格網），刻意跟動態消息那邊的個人頁
              （ProfileView）不一樣，一眼能分辨現在是在「看影片」還是「看動態」。
              點左上角關閉回到搜尋清單，不會整個離開這個 view。
              跟其他功能頁不一樣：這裡故意用 display:none 藏起來，不是條件式
              整個卸載（{cond && <X/>}）——這樣使用者切去別的功能頁面時，正在
              播放的 <video> 元素、播到哪個頻道/哪支影片都還留在原地，點回
              「影片」不會重新整理，播放進度接著上次繼續。 */}
          <div style={{
            flex: 1, minHeight: 0, display: (showVideoHub && !activeFriendId && !activeGroupId) ? "flex" : "none",
            flexDirection: "column",
          }}>
            {videoHubUid ? (
              <ChannelProfileView key={videoHubUid} uid={videoHubUid}
                onClose={() => setVideoHubUid(null)}
                onOpenChannel={setVideoHubUid} />
            ) : (
              <VideoHub onOpenChannel={setVideoHubUid} />
            )}
          </div>

          {/* Leaderboard view — warm-ivory "luxury magazine" pastel design,
              per an exact reference mock (see RANK_PALETTE above for the
              9 rank colors this pulls from). */}
          {showLeaderboard && !activeFriendId && !activeGroupId && !showFeed && !showCalendar && !showVideoHub && (
            <>
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "#FBF9F5", padding: "36px 28px 24px" }}>
                {/* Title */}
                <div style={{ textAlign: "center", marginBottom: 36 }}>
                  <div style={{ fontSize: 34, marginBottom: 6 }}>🏆</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
                    <span style={{ flex: 1, maxWidth: 120, height: 1, background: "linear-gradient(90deg, transparent, #C9A24B)" }} />
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#B8892E", letterSpacing: 6, whiteSpace: "nowrap" }}>
                      TIPPING LEADERBOARD
                    </div>
                    <span style={{ flex: 1, maxWidth: 120, height: 1, background: "linear-gradient(90deg, #C9A24B, transparent)" }} />
                  </div>
                </div>

                {leaderboard.length === 0 && (
                  <div style={{ textAlign: "center", padding: "60px 0", color: "#8a8478" }}>
                    <div style={{ fontSize: 52, marginBottom: 14 }}>🏆</div>
                    <div style={{ fontSize: 16, color: "#5a564c" }}>還沒有人打賞</div>
                    <div style={{ fontSize: 13, marginTop: 6, color: "#8a8478" }}>快來成為第一位吧！</div>
                  </div>
                )}

                {/* All entries */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760, margin: "0 auto" }}>
                  {leaderboard.map((entry, i) => {
                    const rank = i + 1;
                    const suffix = rank === 1 ? "ST" : rank === 2 ? "ND" : rank === 3 ? "RD" : "TH";
                    const title = RANK_TITLES[i] || `${rank}TH SUPPORTER`;
                    const p = RANK_PALETTE[i] || RANK_PALETTE_FALLBACK;
                    return (
                      <div key={entry.userId} style={{
                        display: "flex", alignItems: "center", gap: 16,
                        padding: "14px 26px 14px 16px",
                        borderRadius: 60,
                        background: p.rowBg,
                        border: `1px solid ${p.border}`,
                        boxShadow: "0 1px 0 rgba(255,255,255,0.6) inset, 0 -6px 12px rgba(0,0,0,0.03) inset, 0 4px 14px rgba(120,100,60,0.08)",
                      }}>
                        {/* Rank badge */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: "50%", background: p.badge, flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>
                          <span style={{ fontSize: 19, fontWeight: 800, color: p.badgeText, lineHeight: 1.1 }}>{rank}</span>
                          <span style={{ fontSize: 8, fontWeight: 700, color: p.badgeTextMuted, letterSpacing: 1 }}>{suffix}</span>
                        </div>
                        {/* Avatar */}
                        <div style={{ borderRadius: "50%", boxShadow: `0 0 0 2px #FBF9F5, 0 0 0 4px ${p.ring}`, flexShrink: 0 }}>
                          <AvatarImg avatarImage={entry.userAvatarImage} avatar={entry.userAvatar} color={entry.userColor} size={48} />
                        </div>
                        {/* Name + title */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 17, color: "#2C2C2C", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.userNickname}</div>
                          <div style={{ fontSize: 10, color: "#8a7550", letterSpacing: 2, fontWeight: 700, marginTop: 3 }}>{title}</div>
                        </div>
                        {/* Amount */}
                        <div style={{ fontWeight: 800, fontSize: 19, color: "#2C2C2C", flexShrink: 0, letterSpacing: 0.3 }}>HK${entry.total.toLocaleString()}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ padding: "14px 20px", background: "#FBF9F5", borderTop: "1px solid rgba(201,162,75,0.25)", flexShrink: 0 }}>
                <button onClick={() => setShowDonateModal(true)}
                  style={{ width: "100%", background: "linear-gradient(135deg,#F4BF45,#D9A73B)", border: "none", borderRadius: 999, padding: "13px", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(212,168,45,0.35)", letterSpacing: 1 }}>
                  🎁 立即打賞
                </button>
              </div>
            </>
          )}

          {/* Cinema view */}
          {showCinema && !activeFriendId && !activeGroupId && !showLeaderboard && !showFeed && !showCalendar && !showVideoHub && (
            <>
              {cinemaView === 'list' && (
                <>
                  {/* Header */}
                  <div style={{ height: 56, borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, background: "var(--panel-alt)", flexShrink: 0 }}>
                    <span style={{ fontSize: 20 }}>🎬</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>電影院</div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)" }}>同步觀看直播</div>
                    </div>
                    <button onClick={() => setShowCreateCinema(true)}
                      style={{ marginLeft: "auto", background: "#2563eb", border: "none", borderRadius: "var(--radius-md)", padding: "7px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      + 建立直播
                    </button>
                  </div>
                  {/* Room list */}
                  <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "24px 28px" }}>
                    {cinemaRooms.length === 0 && (
                      <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-dim)" }}>
                        <div style={{ fontSize: 56, marginBottom: 16 }}>🎬</div>
                        <div style={{ fontSize: 16, color: "var(--text-faint)" }}>目前沒有進行中的直播</div>
                        <div style={{ fontSize: 13, marginTop: 8, color: "var(--text-dim)" }}>快來建立第一個吧！</div>
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 700, margin: "0 auto" }}>
                      {cinemaRooms.map(room => (
                        <div key={room.id} style={{ background: "var(--panel-alt)", border: "1px solid var(--panel)", borderRadius: "var(--radius-lg)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                          <AvatarImg avatarImage={room.hostAvatarImage} avatar={room.hostAvatar} color={room.hostColor} size={44} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 4 }}>{room.title}</div>
                            <div style={{ fontSize: 12, color: "var(--text-faint)" }}>主持人：{room.hostNickname}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: 1 }}>🔴 LIVE</span>
                            <button onClick={() => joinCinemaRoom(room)}
                              style={{ background: "linear-gradient(135deg,#2563eb,var(--accent-active))", border: "none", borderRadius: "var(--radius-md)", padding: "8px 18px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                              加入
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Create room modal */}
                  {showCreateCinema && (
                    <div className="cr-sheet-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600 }}>
                      <div className="cr-sheet" style={{ background: "var(--panel-alt)", border: "1px solid var(--panel)", borderRadius: 20, padding: "32px", width: 360, maxWidth: "92vw", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", boxSizing: "border-box" }}>
                        <div style={{ fontWeight: 700, fontSize: 18, color: "var(--text)", marginBottom: 20 }}>🎬 建立新直播</div>
                        <input type="text" value={cinemaTitleInput} onChange={e => setCinemaTitleInput(e.target.value)}
          placeholder="輸入直播標題（例如：電影之夜）"
                          style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "11px 14px", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
                        <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 20 }}>建立直播後，點擊開始畫面分享，好友就能同步觀看囉！</div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <button onClick={() => { setShowCreateCinema(false); setCinemaTitleInput(''); }}
                            style={{ flex: 1, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "11px", color: "var(--text-muted)", fontSize: 14, cursor: "pointer" }}>取消</button>
                          <button onClick={createCinemaRoom}
                            style={{ flex: 1, background: "linear-gradient(135deg,#2563eb,var(--accent-active))", border: "none", borderRadius: "var(--radius-md)", padding: "11px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>建立直播</button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {cinemaView === 'room' && activeCinemaRoom && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#000", minHeight: 0 }}>
                  {/* Top bar */}
                  <div style={{ height: 48, background: "#0a0a0a", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0 }}>
                    <button onClick={() => leaveCinemaRoom(activeCinemaRoom.id, isHosting)}
                      style={{ background: "var(--panel)", border: "none", borderRadius: "var(--radius-sm)", padding: "6px 14px", color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}>離開直播</button>
                    <span style={{ color: "var(--text)", fontWeight: 600, fontSize: 14 }}>{activeCinemaRoom.title}</span>
                    <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: 1 }}>🔴 LIVE</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)", fontSize: 13 }}>👁️ {cinemaViewerCount}</span>
                        <span style={{ marginLeft: "auto", color: "var(--text-faint)", fontSize: 12 }}>主持人：{activeCinemaRoom.hostNickname}</span>
                  </div>
                  {/* Video area */}
                  <div style={{ flex: 1, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0 }}>
                    {isHosting && !screenStream ? (
                      <button onClick={startHostStream}
                        style={{ background: "linear-gradient(135deg,#2563eb,var(--accent-active))", border: "none", borderRadius: 14, padding: "16px 32px", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
                        開始畫面分享
                      </button>
                    ) : isHosting ? (
                      <video ref={localVideoRef} autoPlay muted playsInline
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    ) : remoteStream ? (
                      <video ref={remoteVideoRef} autoPlay playsInline
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    ) : (
                      <div style={{ textAlign: "center", color: "var(--text-dim)" }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>📺</div>
                        <div style={{ fontSize: 14 }}>等待主持人開始畫面分享...</div>
                      </div>
                    )}
                  </div>
                  {/* Comments area */}
                  <div style={{ height: 220, background: "var(--bg)", borderTop: "1px solid var(--panel)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
                    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "10px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                      {cinemaComments.length === 0 && (
                        <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "left", paddingTop: 8 }}>還沒有留言，快來說第一句吧！</div>
                      )}
                      {cinemaComments.map(c => (
                        <div key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <AvatarImg avatarImage={c.userAvatarImage} avatar={c.userAvatar} color={c.userColor} size={24} />
                          <div style={{ textAlign: "left" }}>
                            <span style={{ fontSize: 12, color: "var(--text-faint)", marginRight: 6 }}>{c.userNickname}</span>
                            <span style={{ fontSize: 14, color: "var(--text)" }}>{c.text}</span>
                          </div>
                        </div>
                      ))}
                      <div ref={cinemaCommentsEndRef} />
                    </div>
                    <div style={{ padding: "8px 12px", borderTop: "1px solid var(--panel)", display: "flex", gap: 8 }}>
                      <input type="text" value={cinemaInput} onChange={e => setCinemaInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendCinemaComment()}
                        placeholder="留言..."
                        style={{ flex: 1, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "8px 12px", color: "var(--text)", fontSize: 14, outline: "none" }} />
                      <button className="sb" onClick={sendCinemaComment}
                        style={{ background: "var(--accent)", border: "none", borderRadius: "var(--radius-md)", padding: "8px 16px", color: "var(--accent-text)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>傳送</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Image editor view */}
          {showImageEditor && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showFeed && !showDocConvert && !showAiCompanion && !showUpgrade && !showCalendar && !showVideoHub && (
            <ImageEditorRoom />
          )}

          {/* AI chat view */}
          {showAiChat && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showFeed && !showImageEditor && !showDocConvert && !showAiCompanion && !showUpgrade && !showCalendar && !showVideoHub && (
            <AiChatRoom user={user} db={db} />
          )}

          {/* Doc convert view */}
          {showDocConvert && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showFeed && !showImageEditor && !showAiChat && !showAiCompanion && !showUpgrade && !showCalendar && !showVideoHub && (
            <DocConvertRoomLazy />
          )}

          {/* AI 夥伴 view */}
          {showAiCompanion && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showFeed && !showImageEditor && !showAiChat && !showDocConvert && !showUpgrade && !showCalendar && !showVideoHub && (
            <AiCompanionRoom user={user} db={db} myProfile={myProfile} onOpenCreator={() => setShowCompanionCreator(true)} />
          )}

          {/* Upgrade membership view — layout only, no real Stripe wiring yet */}
          {showUpgrade && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showFeed && !showImageEditor && !showAiChat && !showDocConvert && !showAiCompanion && !showCalendar && !showVideoHub && (
            <UpgradeMembership />
          )}

          {/* Vocab view */}
          {showVocab && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showFeed && !showImageEditor && !showAiChat && !showDocConvert && !showAiCompanion && !showUpgrade && !showCalendar && !showVideoHub && (
            <VocabRoom user={user} db={db} />
          )}

          {/* Spanish view */}
          {showSpanish && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showVocab && !showFeed && !showImageEditor && !showAiChat && !showDocConvert && !showAiCompanion && !showUpgrade && !showCalendar && !showVideoHub && (
            <SpanishRoom user={user} db={db} />
          )}

          {/* Spanish Course view */}
          {showSpanishCourse && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showVocab && !showSpanish && !showFeed && !showImageEditor && !showAiChat && !showDocConvert && !showAiCompanion && !showUpgrade && !showCalendar && !showVideoHub && (
            <SpanishCourseRoom user={user} db={db} onContextChange={setSpanishCourseNoteContext} />
          )}

          {/* Spanish Pronunciation view */}
          {showSpanishPron && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showVocab && !showSpanish && !showSpanishCourse && !frenchView && !showFeed && !showImageEditor && !showAiChat && !showDocConvert && !showAiCompanion && !showUpgrade && !showCalendar && !showVideoHub && (
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}><SpanishPronunciation onNav={() => { setShowSpanishPron(false); if (isMobile) setMobileView('more'); }} /></div>
          )}

          {/* Spanish Grammar view */}
          {showSpanishGrammar && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showVocab && !showSpanish && !showSpanishCourse && !frenchView && !showFeed && !showImageEditor && !showAiChat && !showDocConvert && !showAiCompanion && !showUpgrade && !showCalendar && !showVideoHub && (
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}><SpanishGrammar onNav={() => { setShowSpanishGrammar(false); if (isMobile) setMobileView('more'); }} /></div>
          )}

          {/* Spanish Verb Conjugator view */}
          {showSpanishVerbs && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showVocab && !showSpanish && !showSpanishCourse && !frenchView && !showFeed && !showImageEditor && !showAiChat && !showDocConvert && !showAiCompanion && !showUpgrade && !showCalendar && !showVideoHub && (
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}><SpanishVerbConjugator onNav={() => { setShowSpanishVerbs(false); if (isMobile) setMobileView('more'); }} /></div>
          )}

          {/* English Pronunciation view */}
          {showEnglishPron && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showVocab && !showSpanish && !showSpanishCourse && !frenchView && !showSpanishPron && !showSpanishGrammar && !showSpanishVerbs && !showFeed && !showImageEditor && !showAiChat && !showDocConvert && !showAiCompanion && !showUpgrade && !showCalendar && !showVideoHub && (
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}><EnglishPronunciation user={user} db={db} onNav={() => { setShowEnglishPron(false); if (isMobile) setMobileView('more'); }} /></div>
          )}

          {/* Custom vocab view */}
          {showCustomVocab && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showVocab && !showSpanish && !showSpanishCourse && !showFeed && !showImageEditor && !showAiChat && !showDocConvert && !showAiCompanion && !showUpgrade && !showCalendar && !showVideoHub && (
            <CustomVocabRoom user={myProfile || user} db={db} />
          )}

          {/* Dictionary view */}
          {showDict && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showVocab && !showSpanish && !showSpanishCourse && !showCustomVocab && !showFeed && !showImageEditor && !showAiChat && !showDocConvert && !showAiCompanion && !showUpgrade && !showCalendar && !showVideoHub && (
            <DictionaryRoom />
          )}

          {/* Public hall */}
          {/* IELTS Band 4 view */}
          {showIeltsBand4 && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showVocab && !showSpanish && !showSpanishCourse && !frenchView && !showSpanishPron && !showSpanishGrammar && !showSpanishVerbs && !showEnglishPron && !showFeed && !showImageEditor && !showAiChat && !showDocConvert && !showAiCompanion && !showUpgrade && !showCalendar && !showVideoHub && (
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}><IeltsBand4 onNav={() => { setShowIeltsBand4(false); if (isMobile) setMobileView('more'); }} /></div>
          )}

          {!activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showVocab && !showSpanish && !showSpanishCourse && !showCustomVocab && !showDict && !frenchView && !showSpanishPron && !showSpanishGrammar && !showSpanishVerbs && !showEnglishPron && !showIeltsBand4 && !showFeed && !showImageEditor && !showAiChat && !showDocConvert && !showAiCompanion && !showUpgrade && !showCalendar && !showVideoHub && (
            <>
              <div className="cr-chat-header" style={{ height: 56, borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0 }}>
                <span style={{ fontSize: 20 }}>💬</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}># 公共大廳</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)" }}>大家都可以看到這裡的訊息</div>
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 2, background: "transparent" }}>
                <div style={{ textAlign: "center", color: "var(--text-dim)", fontSize: 12, padding: "8px 0 16px" }}>
                  今天 · {new Date().toLocaleDateString("zh-TW", { month: "long", day: "numeric" })}
                </div>
                {hallMessages.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-dim)" }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
                    <div>大廳還沒有訊息，來說第一句話吧！</div>
                  </div>
                )}
                {hallMessages.map((msg, i) => {
                  if (msg.isSystem) return (
                    <div key={msg.id} style={{ textAlign: "center", marginBottom: 10 }}>
                      <span style={{ background: "var(--panel)", color: "var(--text-faint)", fontSize: 12, padding: "5px 14px", borderRadius: 20, border: "1px solid var(--border)" }}>ℹ️ {msg.text}</span>
                    </div>
                  );
                  const isMine = msg.senderId === uid;
                  const showSender = !isMine && hallMessages[i-1]?.senderId !== msg.senderId;
                  return <MessageBubble key={msg.id} msg={msg} isMine={isMine} showSender={showSender} myUid={uid} collectionPath={["hall_messages", msg.id]} msgFontSize={msgFontSize} prevCreatedAt={hallMessages[i-1]?.createdAt} />;
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="cr-input-bar" style={{ padding: "10px 14px 14px", borderTop: "var(--toolbar-inner-divider, 1px solid var(--panel))", flexShrink: 0, position: "relative", boxSizing: "border-box" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", height: "var(--inputbar-field-h, auto)" }}>
                  <input ref={hallFileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { sendHallMedia(f); e.target.value = ""; } }} />
                  <button onClick={() => hallFileRef.current?.click()} disabled={hallUploading} title="上傳圖片/影片"
                    style={{ background: "var(--toolbar-btn-bg, none)", border: "1px solid var(--border)", borderRadius: "var(--toolbar-btn-radius, var(--radius-md))", width: "var(--toolbar-btn-height, auto)", height: "var(--toolbar-btn-height, auto)", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, cursor: hallUploading ? "default" : "pointer", fontSize: 16, color: "var(--text-faint)", flexShrink: 0 }}>
                    {hallUploading ? "⏳" : "📎"}
                  </button>
                  <button ref={hallEmojiBtnRef} onClick={() => { if (isMobile && document.activeElement?.blur) document.activeElement.blur(); setEmojiPickerOpen(v => v === 'hall' ? null : 'hall'); }} title="表情/手勢"
                    style={{ background: "var(--toolbar-btn-bg, none)", border: "1px solid var(--border)", borderRadius: "var(--toolbar-btn-radius, var(--radius-md))", width: "var(--toolbar-btn-height, auto)", height: "var(--toolbar-btn-height, auto)", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, cursor: "pointer", fontSize: 16, color: "var(--text-faint)", flexShrink: 0 }}>
                    😊
                  </button>
                  <input type="text" value={hallInput} onChange={e => setHallInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendHall()} placeholder="輸入訊息..."
                    style={{ flex: 1, minWidth: 0, height: "var(--inputbar-field-h, auto)", boxSizing: "border-box", background: "var(--inputfield-bg, var(--panel))", border: "1px solid var(--border)", borderRadius: "var(--search-radius, var(--radius-md))", padding: "9px 14px", color: "var(--text)", fontSize: 16, outline: "none" }} />
                  <button className="sb" onClick={sendHall} style={{ background: "var(--sendbtn-bg, var(--accent))", border: "none", borderRadius: "var(--toolbar-btn-radius, var(--radius-md))", width: "var(--sendbtn-width, auto)", height: "var(--sendbtn-height, auto)", boxSizing: "border-box", padding: "9px 16px", color: "var(--accent-text)", cursor: "pointer", fontSize: 14, fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" }}>傳送</button>
                </div>
                {emojiPickerOpen === 'hall' && (
                  <EmojiStickerPicker isMobile={isMobile} anchorRef={hallEmojiBtnRef} uid={uid}
                    onClose={() => setEmojiPickerOpen(null)}
                    onInsertEmoji={ch => setHallInput(v => v + ch)}
                    onSendItem={item => sendHallItem(item)} />
                )}
              </div>
            </>
          )}

          {/* Private chat */}
          {activeFriendId && activeFriendProfile && (
            <>
              <div className="cr-chat-header" style={{ height: 56, borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0 }}>
                <div style={{ position: "relative" }}>
                  <AvatarImg avatarImage={activeFriendProfile.avatarImage} avatar={activeFriendProfile.avatar} color={activeFriendProfile.color} size={34} />
                  <span style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: getStatus(activeFriendProfile.status).color, border: "2px solid var(--panel-alt)" }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{activeFriendProfile.nickname}</div>
                  <div style={{ fontSize: 11, color: getStatus(activeFriendProfile.status).color }}>
                    {getStatus(activeFriendProfile.status).label}{activeFriendProfile.statusText ? ` · ${activeFriendProfile.statusText}` : ""}
                  </div>
                </div>
                <Link href={`/profile/${activeFriendProfile.uid}`} style={{ marginLeft: "auto", color: "var(--text-faint)", fontSize: 12, textDecoration: "none" }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--text-muted)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text-faint)"}>
                  ℹ️ 個人檔案
                </Link>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 2, backgroundImage: "var(--chat-world-no-image, radial-gradient(circle at 1px 1px, var(--panel) 1px, transparent 0))", backgroundSize: "28px 28px" }}>
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <AvatarImg avatarImage={activeFriendProfile.avatarImage} avatar={activeFriendProfile.avatar} color={activeFriendProfile.color} size={56} />
                  <div style={{ marginTop: 8, fontWeight: 700, fontSize: 15 }}>{activeFriendProfile.nickname}</div>
                  {activeFriendProfile.bio && <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4, maxWidth: 260, margin: "4px auto 0" }}>{activeFriendProfile.bio}</div>}
                  <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>你們已經是好友了</div>
                </div>
                {privateMessages.map((msg, i) => {
                  const isMine = msg.senderId === uid;
                  return <MessageBubble key={msg.id} msg={msg} isMine={isMine} showSender={!isMine && privateMessages[i-1]?.senderId !== msg.senderId} myUid={uid} collectionPath={["private_chats", chatId, "messages", msg.id]} msgFontSize={msgFontSize} prevCreatedAt={privateMessages[i-1]?.createdAt} />;
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="cr-input-bar" style={{ padding: "10px 14px 14px", borderTop: "var(--toolbar-inner-divider, 1px solid var(--panel))", flexShrink: 0, position: "relative", boxSizing: "border-box" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", height: "var(--inputbar-field-h, auto)" }}>
                  <input ref={privateFileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { sendPrivateMedia(f); e.target.value = ""; } }} />
                  <button onClick={() => privateFileRef.current?.click()} disabled={privateUploading} title="上傳圖片/影片"
                    style={{ background: "var(--toolbar-btn-bg, none)", border: "1px solid var(--border)", borderRadius: "var(--toolbar-btn-radius, var(--radius-md))", width: "var(--toolbar-btn-height, auto)", height: "var(--toolbar-btn-height, auto)", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, cursor: privateUploading ? "default" : "pointer", fontSize: 16, color: "var(--text-faint)", flexShrink: 0 }}>
                    {privateUploading ? "⏳" : "📎"}
                  </button>
                  <button ref={privateEmojiBtnRef} onClick={() => { if (isMobile && document.activeElement?.blur) document.activeElement.blur(); setEmojiPickerOpen(v => v === 'private' ? null : 'private'); }} title="表情/手勢"
                    style={{ background: "var(--toolbar-btn-bg, none)", border: "1px solid var(--border)", borderRadius: "var(--toolbar-btn-radius, var(--radius-md))", width: "var(--toolbar-btn-height, auto)", height: "var(--toolbar-btn-height, auto)", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, cursor: "pointer", fontSize: 16, color: "var(--text-faint)", flexShrink: 0 }}>
                    😊
                  </button>
                  <input type="text" value={privateInput} onChange={e => setPrivateInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendPrivate()} placeholder={`傳送訊息給 ${activeFriendProfile.nickname}...`}
                    style={{ flex: 1, minWidth: 0, height: "var(--inputbar-field-h, auto)", boxSizing: "border-box", background: "var(--inputfield-bg, var(--panel))", border: "1px solid var(--border)", borderRadius: "var(--search-radius, var(--radius-md))", padding: "9px 14px", color: "var(--text)", fontSize: 16, outline: "none" }} />
                  <button className="sb" onClick={sendPrivate} disabled={!privateInput.trim()}
                    style={{ background: privateInput.trim() ? "var(--sendbtn-bg, var(--accent))" : "var(--panel)", border: "none", borderRadius: "var(--toolbar-btn-radius, var(--radius-md))", width: "var(--sendbtn-width, auto)", height: "var(--sendbtn-height, auto)", boxSizing: "border-box", padding: "9px 16px", color: privateInput.trim() ? "var(--accent-text)" : "var(--text-dim)", cursor: privateInput.trim() ? "pointer" : "default", fontSize: 14, fontWeight: 600, transition: "all 0.15s", flexShrink: 0, whiteSpace: "nowrap" }}>
                    傳送                  </button>
                </div>
                {emojiPickerOpen === 'private' && (
                  <EmojiStickerPicker isMobile={isMobile} anchorRef={privateEmojiBtnRef} uid={uid}
                    onClose={() => setEmojiPickerOpen(null)}
                    onInsertEmoji={ch => setPrivateInput(v => v + ch)}
                    onSendItem={item => sendPrivateItem(item)} />
                )}
                <div style={{ textAlign: "right", fontSize: 11, color: "var(--border)", marginTop: 4 }}>私訊只有你們兩人看得到 · 雙方都可以撤回訊息</div>
              </div>
            </>
          )}

          {/* Group chat */}
          {activeGroupId && activeGroup && showGroupInfo && (
            <GroupInfoView
              group={activeGroup}
              messages={groupMessages}
              myUid={uid}
              onClose={() => setShowGroupInfo(false)}
              onOpenProfile={(m) => { setShowGroupInfo(false); setViewProfileUid(m); }}
            />
          )}
          {activeGroupId && activeGroup && !showGroupInfo && (
            <>
              <div className="cr-chat-header" style={{ height: 56, borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0 }}>
                <input ref={groupAvatarFileRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) changeGroupAvatar(f); e.target.value = ""; }} />
                <button onClick={() => groupAvatarFileRef.current?.click()} disabled={groupAvatarUploading}
                  title="更換群組頭像" aria-label="更換群組頭像"
                  style={{
                    width: 34, height: 34, borderRadius: "50%", flexShrink: 0, padding: 0,
                    border: "none", cursor: groupAvatarUploading ? "default" : "pointer",
                    background: "linear-gradient(135deg,var(--text-dim),var(--border))",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                    overflow: "hidden", opacity: groupAvatarUploading ? 0.6 : 1,
                  }}>
                  {isGroupAvatarImage(activeGroup.avatar)
                    ? <img src={activeGroup.avatar} alt={activeGroup.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    : (activeGroup.avatar || (activeGroup.name ? activeGroup.name.slice(0, 1).toUpperCase() : "👥"))}
                </button>
                <button onClick={() => setShowGroupInfo(true)} title="查看群組資訊"
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{activeGroup.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{(activeGroup.members || []).length} 位成員</div>
                </button>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 2, background: "transparent" }}>
                {groupMessages.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-dim)" }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
                    <div>群組剛建立，開始聊天吧！</div>
                  </div>
                )}
                {groupMessages.map((msg, i) => {
                  const isMine = msg.senderId === uid;
                  const showSender = !isMine && groupMessages[i-1]?.senderId !== msg.senderId;
                  return <MessageBubble key={msg.id} msg={msg} isMine={isMine} showSender={showSender} myUid={uid} collectionPath={["groups", activeGroupId, "messages", msg.id]} msgFontSize={msgFontSize} prevCreatedAt={groupMessages[i-1]?.createdAt} />;
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="cr-input-bar" style={{ padding: "10px 14px 14px", borderTop: "var(--toolbar-inner-divider, 1px solid var(--panel))", flexShrink: 0, position: "relative", boxSizing: "border-box" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", height: "var(--inputbar-field-h, auto)" }}>
                  <input ref={groupFileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { sendGroupMedia(f); e.target.value = ""; } }} />
                  <button onClick={() => groupFileRef.current?.click()} disabled={groupUploading} title="上傳圖片/影片"
                    style={{ background: "var(--toolbar-btn-bg, none)", border: "1px solid var(--border)", borderRadius: "var(--toolbar-btn-radius, var(--radius-md))", width: "var(--toolbar-btn-height, auto)", height: "var(--toolbar-btn-height, auto)", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, cursor: groupUploading ? "default" : "pointer", fontSize: 16, color: "var(--text-faint)", flexShrink: 0 }}>
                    {groupUploading ? "⏳" : "📎"}
                  </button>
                  <button ref={groupEmojiBtnRef} onClick={() => { if (isMobile && document.activeElement?.blur) document.activeElement.blur(); setEmojiPickerOpen(v => v === 'group' ? null : 'group'); }} title="表情/手勢"
                    style={{ background: "var(--toolbar-btn-bg, none)", border: "1px solid var(--border)", borderRadius: "var(--toolbar-btn-radius, var(--radius-md))", width: "var(--toolbar-btn-height, auto)", height: "var(--toolbar-btn-height, auto)", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, cursor: "pointer", fontSize: 16, color: "var(--text-faint)", flexShrink: 0 }}>
                    😊
                  </button>
                  <input type="text" value={groupInput} onChange={e => setGroupInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendGroup()} placeholder={`傳送訊息給 ${activeGroup.name}...`}
                    style={{ flex: 1, minWidth: 0, height: "var(--inputbar-field-h, auto)", boxSizing: "border-box", background: "var(--inputfield-bg, var(--panel))", border: "1px solid var(--border)", borderRadius: "var(--search-radius, var(--radius-md))", padding: "9px 14px", color: "var(--text)", fontSize: 16, outline: "none" }} />
                  <button className="sb" onClick={sendGroup} style={{ background: "var(--sendbtn-bg, var(--accent))", border: "none", borderRadius: "var(--toolbar-btn-radius, var(--radius-md))", width: "var(--sendbtn-width, auto)", height: "var(--sendbtn-height, auto)", boxSizing: "border-box", padding: "9px 16px", color: "var(--accent-text)", cursor: "pointer", fontSize: 14, fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" }}>傳送</button>
                </div>
                {emojiPickerOpen === 'group' && (
                  <EmojiStickerPicker isMobile={isMobile} anchorRef={groupEmojiBtnRef} uid={uid}
                    onClose={() => setEmojiPickerOpen(null)}
                    onInsertEmoji={ch => setGroupInput(v => v + ch)}
                    onSendItem={item => sendGroupItem(item)} />
                )}
              </div>
            </>
          )}

          {/* Loading friend profile */}
          {activeFriendId && !activeFriendProfile && (
            <div role="status" aria-live="polite" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-faint)" }}>載入中...</div>
          )}
        </main>

        {/* 更多選單（手機版「更多」分頁） */}
        {isMobile && mobileView === 'more' && (
          <ChatMoreMenu
            state={{ showLeaderboard, showCinema, showAiChat, showDocConvert, showAiCompanion, showUpgrade, showEnglishPron, showIeltsBand4, showVocab, showSpanish, showSpanishCourse, showSpanishPron, showSpanishGrammar, showSpanishVerbs, showCustomVocab, showDict }}
            setters={{ setShowLeaderboard, setShowCinema, setShowAiChat, setShowDocConvert, setShowAiCompanion, setShowUpgrade, setShowEnglishPron, setShowIeltsBand4, setShowVocab, setShowSpanish, setShowSpanishCourse, setShowSpanishPron, setShowSpanishGrammar, setShowSpanishVerbs, setShowCustomVocab, setShowDict }}
            onOpen={(setter) => { resetAllViews(); setter(true); setMobileView(null); }}
          />
        )}

        {/* 日曆欄寬度拖曳把手：只在桌面版顯示，雙擊復原成預設寬度。 */}
        {!isMobile && (
          <div
            onMouseDown={e => startPanelResize(e, "cal")}
            onDoubleClick={() => resetPanelWidth("cal")}
            title="拖曳調整寬度（雙擊復原預設）"
            style={{
              display: "var(--resize-handle-display, block)",
              width: 6, flexShrink: 0, cursor: "col-resize",
              background: resizingPanel === "cal" ? "var(--accent)" : "transparent",
              marginLeft: -3, marginRight: -3, zIndex: 30, position: "relative",
            }}
          />
        )}

        {/* Right panel: calendar overlay on mobile, sidebar on desktop */}
        <div className={`cr-cal${calendarOpen ? " cr-cal-open" : ""}`} style={{
          width: `var(--cal-w-override, ${calWidth}px)`, flexShrink: 0, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden",
          border: "var(--col-border, none)",
          borderLeft: "var(--col-border-left, 1px solid var(--panel))",
          borderRadius: "var(--calpanel-radius, var(--col-radius, 0px))",
          margin: "var(--calpanel-margin, 0px)",
          transition: resizingPanel === "cal" ? undefined : "width 0.2s ease",
          // Goes fully transparent while a world is selected, same as
          // .cr-shell/.cr-main/.cr-sidebar — CalendarMemo's own root
          // (cal-inner) is plain transparent too, so <body>'s single copy of
          // the photo shows through both of them with nothing painted twice.
          backgroundColor: "var(--force-panel-bg, var(--chat-world-transparent, var(--panel-alt)))",
          backgroundImage: "var(--chat-world-transparent, var(--panel-gradient-img, none))",
          backdropFilter: "var(--force-panel-blur, none)", WebkitBackdropFilter: "var(--force-panel-blur, none)",
        }}>
          {isMobile && (
            <div style={{ padding: "calc(env(safe-area-inset-top) + 8px) 14px 8px", background: "var(--panel-alt)", borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: "var(--text)" }}>📅 日曆備忘錄</span>
              <button onClick={() => setCalendarOpen(false)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 10px", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>✕ 關閉</button>
            </div>
          )}
          {showUpgrade ? (
            <UpgradeHighlights />
          ) : isMobile ? (
            <>
              {activeSpanishNotes && <PageNotes noteKey={activeSpanishNotes.key} pageTitle={activeSpanishNotes.title} />}
              <CalendarMemo uid={uid} />
            </>
          ) : (
            // 桌面版右欄改放群組 + 好友（日曆改成左側 showCalendar 那個可切換
            // 的一般功能，見上面 .cr-main 裡的 Calendar view）。
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              {/* Groups */}
              <div className="cr-nav-hdr">
                <span className="cr-nav-hdr-label">群組 {myGroups.length}</span>
                <button onClick={() => setShowCreateGroup(true)} title="建立群組" className="cr-nav-icon-btn">+</button>
              </div>
              <div style={{ padding: "0 8px 6px" }}>
                {myGroups.length === 0 && (
                  <div style={{ textAlign: "center", padding: "16px 12px", color: "var(--text-dim)", fontSize: 13 }}>
                    還沒有群組
                  </div>
                )}
                {myGroups.map(group => {
                  const isActive = activeGroupId === group.id;
                  return (
                    <button key={group.id} onClick={() => { resetAllViews(); setActiveGroupId(group.id); }}
                      className={`fb ${isActive ? "act" : ""}`}>
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <div className="cr-fb-icon" style={{ width: 44, height: 44, fontSize: 20 }}>
                          {isGroupAvatarImage(group.avatar)
                            ? <img src={group.avatar} alt={group.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit", display: "block" }} />
                            : (group.avatar || (group.name ? group.name.slice(0, 1).toUpperCase() : "👥"))}
                        </div>
                        <UnreadBadge count={group.unreadCount?.[uid]} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="cr-fb-name" style={{ fontSize: 14 }}>{group.name}</div>
                        <div className="cr-fb-sub">{(group.members || []).length} 人</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Friends */}
              <div className="cr-nav-hdr">
                <span className="cr-nav-hdr-label">好友 {myFriends.length}</span>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {pendingInCount > 0 && (
                    <button onClick={() => setShowFriendReqs(true)} title="好友請求" style={{ background: "#ef4444", border: "none", borderRadius: 20, padding: "2px 8px", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                      🔔 {pendingInCount}
                    </button>
                  )}
                  <button onClick={() => setShowFriendSearch(true)} title="加好友" className="cr-nav-icon-btn">+</button>
                </div>
              </div>
              <div style={{ padding: "0 8px 8px" }}>
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
                      className={`fb ${isActive ? "act" : ""}`}>
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <AvatarImg avatarImage={friend.avatarImage} avatar={friend.avatar} color={friend.color} size={44} />
                        <span style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: "50%", background: getStatus(friend.status).color, border: "2px solid var(--panel-alt)" }} />
                        <UnreadBadge count={privateUnread[friend.uid]} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="cr-fb-name" style={{ fontSize: 14 }}>{friend.nickname}</div>
                        <div className="cr-fb-sub">{friend.signature || getStatus(friend.status).label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {isMobile && (
          <ChatMobileTabBar
            activeTab={
              mobileView === 'more' || (mobileView === null && inMoreTool) ? 'more'
              : showImageEditor ? 'imageEditor'
              : 'chat'
            }
            onSelectChats={() => settleDrawer(true)}
            onSelectMore={() => setMobileView('more')}
            onSelectImageEditor={() => { resetAllViews(); setShowImageEditor(true); }}
            pendingCount={pendingInCount}
          />
        )}
      </div>
    </>
  );
}

