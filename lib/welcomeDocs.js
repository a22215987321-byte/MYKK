import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { chatIdFor, bumpPrivateChatSummary } from "./chatSummary";
import { SHARED_DOCS } from "../data/sharedDocs";

// 新帳號註冊完成後，在「站長 ↔ 新使用者」的私訊裡放進 data/sharedDocs.js 列出
// 的每一份文件，讓對方一進來就有東西可以看，站長不用一個一個手動傳。
//
// 訊息是由「新使用者的瀏覽器」寫的，但 senderId 掛站長——private_chats 的
// create 規則只檢查寫入者是不是這個聊天室的成員，沒有檢查 senderId，所以這樣
// 做得到，不需要 Cloud Function 或 Admin SDK，也不用改 Firestore 規則。
//
// 這確實表示規則允許成員偽造對方的訊息（既有的寬鬆設計，不是這裡引入的）。
// 要收緊就是在規則加上 `request.resource.data.senderId == request.auth.uid`，
// 但那樣這個功能就得改成用後端寫入。
export async function sendWelcomeDocs(owner, newUid) {
  if (!owner?.uid || !newUid || SHARED_DOCS.length === 0) return;
  const cid = chatIdFor(owner.uid, newUid);
  try {
    // 依序寫入，不用 Promise.all——serverTimestamp() 在同一批次可能拿到一模一樣
    // 的時間，訊息順序就會變成不確定的。文件只有兩三份，順序寫的代價很小。
    for (const d of SHARED_DOCS) {
      await addDoc(collection(db, "private_chats", cid, "messages"), {
        senderId: owner.uid,
        sender: owner.nickname || "",
        avatar: owner.avatar || "",
        senderAvatarImage: owner.avatarImage || "",
        // 舊訊息渲染路徑會讀這三個欄位，一律給空字串，不要讓它們是 undefined
        text: "", imageUrl: "", videoUrl: "",
        type: "shared_doc",
        docId: d.id, docName: d.name, docNote: d.note || "",
        createdAt: serverTimestamp(),
      });
    }
    // 摘要的 myUid 是站長：對方的聊天清單才會顯示「站長傳來的未讀訊息」，
    // 而不是自己傳給自己。
    const last = SHARED_DOCS[SHARED_DOCS.length - 1];
    await bumpPrivateChatSummary(owner.uid, newUid, "[文件] " + last.name);
  } catch {
    // 失敗就算了——註冊本身已經完成，少收到歡迎文件不該讓使用者卡在註冊畫面。
  }
}
