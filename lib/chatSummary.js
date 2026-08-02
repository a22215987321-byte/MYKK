import { db } from "./firebase";
import { doc, setDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore";

// 私訊聊天室 id 的規則跟 ChatRoom.js 裡原本那條一致：兩個 uid 排序後用 "_"
// 接起來，任何地方要組出同一個私訊聊天室 id 都呼叫這個，不要各自重複那行。
export function chatIdFor(a, b) {
  return [a, b].sort().join("_");
}

// 每次真的送出訊息後，同步更新聊天室摘要（lastMessage/lastMessageAt/
// lastSenderId + 每個成員各自的未讀數）——ChatRoom.js 的 sendPrivate 系列
// 函式跟 SharePostModal（分享貼文到私訊）共用這一份，行為只會有一個地方要改。
// private_chats/{chatId} 這個父文件可能還沒被建立過，用 setDoc(merge:true)
// 而不是 updateDoc，避免「找不到文件」的錯誤。
export async function bumpPrivateChatSummary(myUid, otherUid, preview) {
  const cid = chatIdFor(myUid, otherUid);
  await setDoc(doc(db, "private_chats", cid), {
    lastMessage: preview,
    lastMessageAt: serverTimestamp(),
    lastSenderId: myUid,
    unreadCount: { [myUid]: 0, [otherUid]: increment(1) },
  }, { merge: true });
}

// groups/{groupId} 一定已經存在（建立群組時就有），用 updateDoc；unreadCount
// 每次都把目前完整成員清單重新寫一遍，不會漏掉其他人已經存在的未讀數。
export async function bumpGroupChatSummary(myUid, groupMembers, groupId, preview) {
  const unreadCount = {};
  (groupMembers || []).forEach(m => { unreadCount[m] = m === myUid ? 0 : increment(1); });
  await updateDoc(doc(db, "groups", groupId), {
    lastMessage: preview,
    lastMessageAt: serverTimestamp(),
    lastSenderId: myUid,
    unreadCount,
  });
}
