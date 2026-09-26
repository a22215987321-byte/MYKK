import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { chatIdFor } from "./chatSummary";

const validUid = value => typeof value === "string" && value.length > 0 && value.length <= 128 && !value.includes("/");

function summaryKey(summary) {
  const timestamp = summary?.lastMessageAt;
  if (!timestamp || !validUid(summary.lastSenderId)) return null;
  const time = typeof timestamp.seconds === "number"
    ? `${timestamp.seconds}.${timestamp.nanoseconds || 0}`
    : timestamp instanceof Date ? timestamp.getTime() : timestamp.toMillis?.();
  return time == null || !Number.isFinite(Number(time)) ? null
    : `${time}:${summary.lastSenderId}:${summary.lastMessage || ""}`;
}

// Ignore the initial server snapshot, cached history, local pending writes and
// unread-count/profile edits. Only a new incoming summary produces a preview.
export function createIncomingSummaryTracker(uid, onIncoming) {
  let ready = false;
  let previousKey = null;
  return (summary, metadata = {}) => {
    if (metadata.fromCache || metadata.hasPendingWrites) return;
    const key = summaryKey(summary);
    if (!ready) { ready = true; previousKey = key; return; }
    if (!key || key === previousKey) return;
    previousKey = key;
    if (summary.lastSenderId === uid) return;
    onIncoming(summary, key);
  };
}

export function messagePreviewText(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? (text.length > 180 ? `${text.slice(0, 180)}…` : text) : "傳來一則新訊息";
}

// Read-only, using the existing conversation summaries. Never query all private
// chats, write receipts, change messages, or give guests access to member data.
export function subscribeIncomingMessages(db, uid, onIncoming, onError = () => {}) {
  let disposed = false;
  let profileReady = false;
  let blocked = new Set();
  const friends = new Map();
  const groups = new Map();
  const profileRequests = new Map();

  const senderProfile = senderId => {
    if (!profileRequests.has(senderId)) {
      const request = getDoc(doc(db, "users", senderId))
        .then(snap => snap.exists() ? snap.data() : {})
        .catch(() => ({}))
        .finally(() => profileRequests.delete(senderId));
      profileRequests.set(senderId, request);
    }
    return profileRequests.get(senderId);
  };

  const publish = async (source, summary, key) => {
    const allowed = () => !disposed && profileReady && !blocked.has(summary.lastSenderId) &&
      (source.kind === "private"
        ? friends.get(source.id) === source && summary.lastSenderId === source.id
        : groups.get(source.id) === source);
    if (!allowed()) return;
    const profile = await senderProfile(summary.lastSenderId);
    if (!allowed()) return;
    onIncoming({
      id: `${source.kind}:${source.id}:${key}`,
      senderId: summary.lastSenderId,
      senderName: typeof profile.nickname === "string" && profile.nickname.trim() ? profile.nickname : "新訊息",
      avatarImage: typeof profile.avatarImage === "string" ? profile.avatarImage : "",
      avatar: typeof profile.avatar === "string" ? profile.avatar : "",
      groupName: source.kind === "group" ? source.name : "",
      text: messagePreviewText(summary.lastMessage),
    });
  };

  const stopProfile = onSnapshot(doc(db, "users", uid), snap => {
    if (disposed) return;
    const profile = snap.exists() ? snap.data() : {};
    profileReady = snap.exists();
    blocked = new Set(Array.isArray(profile.blocked) ? profile.blocked : []);
    const nextFriends = new Set((Array.isArray(profile.friends) ? profile.friends : [])
      .filter(id => validUid(id) && id !== uid && !blocked.has(id)));
    for (const [id, source] of friends) {
      if (!nextFriends.has(id)) { source.stop(); friends.delete(id); }
    }
    for (const id of nextFriends) {
      if (friends.has(id)) continue;
      const source = { kind: "private", id, stop: () => {} };
      const track = createIncomingSummaryTracker(uid, (summary, key) => publish(source, summary, key));
      friends.set(id, source);
      source.stop = onSnapshot(doc(db, "private_chats", chatIdFor(uid, id)), { includeMetadataChanges: true },
        chat => { if (!disposed) track(chat.exists() ? chat.data() : null, chat.metadata); },
        error => { friends.delete(id); onError(error); });
    }
  }, error => {
    profileReady = false;
    for (const source of friends.values()) source.stop();
    friends.clear();
    onError(error);
  });

  const stopGroups = onSnapshot(query(collection(db, "groups"), where("members", "array-contains", uid)),
    { includeMetadataChanges: true }, snap => {
      if (disposed) return;
      const ids = new Set();
      for (const group of snap.docs) {
        const summary = group.data();
        if (!Array.isArray(summary.members) || !summary.members.includes(uid)) continue;
        ids.add(group.id);
        if (!groups.has(group.id)) {
          const source = { kind: "group", id: group.id, name: "群組" };
          source.track = createIncomingSummaryTracker(uid, (data, key) => publish(source, data, key));
          groups.set(group.id, source);
        }
        const source = groups.get(group.id);
        source.name = typeof summary.name === "string" ? summary.name : "群組";
        source.track(summary, snap.metadata);
      }
      for (const id of groups.keys()) if (!ids.has(id)) groups.delete(id);
    }, error => { groups.clear(); onError(error); });

  return () => {
    disposed = true;
    stopProfile();
    stopGroups();
    for (const source of friends.values()) source.stop();
    friends.clear();
    groups.clear();
    profileRequests.clear();
  };
}
