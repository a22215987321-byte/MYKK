import { useEffect, useState, useMemo } from "react";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { toast } from "../lib/toast";
import { AudioQueuePlayer, PlaybackModeMenu } from "./ProfileView";

// 側欄「🎵 音頻」功能頁——內容就是原本藏在「個人頁 → 收藏 → 捲到最下面」
// 的音頻收藏，抽出來變成跟其他功能一樣的一級分頁，點側欄就直接打開。
//
// 刻意不自己寫一份播放器 UI：AudioQueuePlayer／PlaybackModeMenu 都是從
// ProfileView.js import 進來的同一顆元件（那兩個為此改成 export）。使用者
// 要的是「一模一樣」，複製一份 JSX 兩邊就會開始各自長歪，共用元件才保證
// 拖曳排序、單曲循環、播放模式這些行為永遠一致。
//
// 資料查詢也照抄 ProfileView 那份（見它的 favoritePosts useEffect）：
// bookmarks 跟 audioBookmarks 要各查一次再依 id 去重——影片貼文透過「收藏
// MP3」收進來的是寫在 audioBookmarks，不會出現在 bookmarks 的查詢結果裡。
// 排序沿用 users/{uid}.audioFavoritesOrder，跟收藏分頁是同一份順序，在這裡
// 拖曳重排，個人頁那邊看到的順序也會跟著變（本來就該是同一份收藏）。
export default function AudioRoom({ uid, onPlayAudioQueue }) {
  const [posts, setPosts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [order, setOrder] = useState([]);
  const [playbackMode, setPlaybackMode] = useState("sequence");

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      try {
        const [bookmarkSnap, audioBookmarkSnap, userSnap] = await Promise.all([
          getDocs(query(collection(db, "posts"), where("bookmarks", "array-contains", uid))),
          getDocs(query(collection(db, "posts"), where("audioBookmarks", "array-contains", uid))),
          getDoc(doc(db, "users", uid)),
        ]);
        if (cancelled) return;
        const byId = new Map();
        for (const d of bookmarkSnap.docs) byId.set(d.id, { id: d.id, ...d.data() });
        for (const d of audioBookmarkSnap.docs) {
          if (!byId.has(d.id)) byId.set(d.id, { id: d.id, ...d.data() });
        }
        const sorted = [...byId.values()].sort((a, b) => {
          const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return tb - ta;
        });
        setPosts(sorted);
        setOrder(userSnap.exists() ? (userSnap.data().audioFavoritesOrder || []) : []);
      } catch (e) {
        console.error("[AudioRoom] failed to load audio favorites", e);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [uid]);

  // 篩選條件跟 ProfileView 的 FavoritesTab 完全一致：自己收藏的 MP3 貼文，
  // 加上自己用「收藏 MP3」收進來的影片貼文（影片本身不重新編碼，<audio>
  // 直接播 videoUrl 只取聲音軌）。
  const audioFavorites = useMemo(() => posts.filter(p =>
    (p.audioUrl && (p.bookmarks || []).includes(uid)) ||
    (p.videoUrl && (p.audioBookmarks || []).includes(uid))
  ), [posts, uid]);

  const orderedTracks = useMemo(() => {
    const byId = new Map(audioFavorites.map(t => [t.id, t]));
    const ordered = order.map(id => byId.get(id)).filter(Boolean);
    const seen = new Set(ordered.map(t => t.id));
    return [...ordered, ...audioFavorites.filter(t => !seen.has(t.id))];
  }, [audioFavorites, order]);

  const handleReorder = async (newTracks) => {
    const ids = newTracks.map(t => t.id);
    setOrder(ids);   // 先更新本地，拖完就定位，不用等 Firestore 回來
    try {
      await updateDoc(doc(db, "users", uid), { audioFavoritesOrder: ids });
    } catch (e) {
      console.error("[AudioRoom] reorder audio favorites failed", e);
      toast("排序儲存失敗，請重試");
    }
  };

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>音頻收藏</div>
          <PlaybackModeMenu value={playbackMode} onChange={setPlaybackMode} />
        </div>
        {!loaded ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-dim)", fontSize: 13 }}>載入中...</div>
        ) : orderedTracks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-dim)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎵</div>
            <div style={{ fontSize: 15 }}>還沒有收藏任何音樂</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>在動態消息的貼文按 🎵 就會收進這裡</div>
          </div>
        ) : (
          <AudioQueuePlayer tracks={orderedTracks} onPlayAudioQueue={onPlayAudioQueue} onReorder={handleReorder} />
        )}
      </div>
    </div>
  );
}
