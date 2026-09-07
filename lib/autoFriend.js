import { collection, query, where, limit, getDocs, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "./firebase";
import { OWNER_EMAIL } from "./admin";

// 新帳號一註冊就自動跟站長互加好友，這樣站長可以直接私訊傳東西過去，
// 不用等對方先找到「加好友」再送出請求、再被接受這三步。
//
// 為什麼查 email 而不是把 uid 寫死：uid 是 Firebase 產生的亂數字串，寫進
// 原始碼之後如果站長帳號重建就會指到一個不存在的人，而且看程式的人完全
// 看不出那串亂碼是誰。email 已經在 admin.js 裡當作站長的識別方式，這裡沿用
// 同一個來源，不另外開一個會跟它不同步的設定。
//
// 權限上為什麼做得到：users 的 update 規則允許任何登入者改動別人文件的
// friends / pendingIn / pendingOut 這幾個欄位（好友請求本來就需要寫對方的
// 文件），所以新使用者有權把自己加進站長的 friends。

// 回傳站長的 { uid, nickname, avatar, avatarImage }；找不到、或註冊的人就是
// 站長本人，回傳 null。歡迎文件的訊息要掛站長的暱稱和頭像，所以連同資料一起
// 回傳，不要為了同一份文件再查一次。
export async function findOwner(newUserEmail) {
  if (!OWNER_EMAIL) return null;
  // 站長自己註冊時不要跟自己做朋友
  if (newUserEmail && newUserEmail.toLowerCase() === OWNER_EMAIL.toLowerCase()) return null;
  try {
    const snap = await getDocs(query(
      collection(db, "users"),
      where("email", "==", OWNER_EMAIL),
      limit(1),
    ));
    if (snap.empty) return null;
    const d = snap.docs[0];
    const v = d.data() || {};
    return { uid: d.id, nickname: v.nickname || "", avatar: v.avatar || "", avatarImage: v.avatarImage || "" };
  } catch {
    // 查不到就當作沒這回事。這個功能是附加的，不該讓註冊整個失敗。
    return null;
  }
}

// 把新使用者加進站長的好友清單。新使用者那一側的 friends 由呼叫端在建立
// 自己的 users 文件時一起寫進去（那份文件本來就要建，省一次寫入），所以
// 這裡只處理站長這一側。
//
// 呼叫順序很重要：一定要等新使用者的 users 文件建好之後再呼叫，否則站長的
// 好友清單裡會短暫出現一個查不到暱稱和頭像的 uid。
export async function linkOwnerToNewUser(ownerUid, newUid) {
  if (!ownerUid || !newUid) return;
  try {
    await updateDoc(doc(db, "users", ownerUid), { friends: arrayUnion(newUid) });
  } catch {
    // 同上：失敗就算了，使用者仍然註冊成功，只是少一個預設好友。
  }
}
