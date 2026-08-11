import { db } from "../../../lib/firebase";
import { collection, getDocs, query, where, doc, updateDoc, addDoc } from "firebase/firestore";
import { runOfficeTask, safeError } from "../../../lib/officeTaskEngine";

// AI Office 的日程日曆（見 components/office/Workspace.js 的
// ScheduleCalendar）——排定的任務不用開著網站也會執行，靠 Vercel Cron 每
// 10 分鐘打這支一次（見專案根目錄 vercel.json 的 crons 區塊），檢查有沒有
// 到期的排程，到了就直接執行並把結果寫進 officeTasks（跟手動新增任務、
// AI對話建立任務是同一份資料，執行檔案庫看得到）。
//
// 只用單一欄位（status=="scheduled"）查詢，不加 scheduledFor 的範圍條件
// 一起查——Firestore 對「等於」+「範圍」跨欄位查詢通常需要額外建立複合
// 索引，這裡預期排程數量不多（個人使用），直接把所有 scheduled 的都抓下來、
// 在程式裡用 JS 判斷是否到期，不用使用者自己去 Firebase Console 建索引。
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const q = query(collection(db, "officeSchedules"), where("status", "==", "scheduled"));
    const snap = await getDocs(q);
    const now = Date.now();
    const due = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((item) => Date.parse(item.scheduledFor) <= now);

    const results = [];
    for (const schedule of due) {
      try {
        await updateDoc(doc(db, "officeSchedules", schedule.id), { status: "running" });
        const output = await runOfficeTask({
          title: schedule.title, brief: schedule.brief || "", assigneeId: schedule.assigneeId,
          kind: schedule.kind, targetDate: schedule.targetDate || "",
        });
        const taskRef = await addDoc(collection(db, "officeTasks"), {
          title: schedule.title, assigneeId: schedule.assigneeId, brief: schedule.brief || "",
          kind: schedule.kind, targetDate: schedule.targetDate || "",
          progress: 100, status: "completed", color: "blue", source: "schedule",
          createdAt: new Date().toISOString(), completedAt: new Date().toISOString(),
          result: output.result, model: output.model, scheduledId: schedule.id,
        });
        await updateDoc(doc(db, "officeSchedules", schedule.id), {
          status: "completed", executedAt: new Date().toISOString(), executedTaskId: taskRef.id,
        });
        results.push({ id: schedule.id, status: "completed" });
      } catch (err) {
        const message = safeError(err);
        await addDoc(collection(db, "officeTasks"), {
          title: schedule.title, assigneeId: schedule.assigneeId, brief: schedule.brief || "",
          kind: schedule.kind, targetDate: schedule.targetDate || "",
          progress: 0, status: "failed", color: "blue", source: "schedule",
          createdAt: new Date().toISOString(), completedAt: new Date().toISOString(),
          error: message, scheduledId: schedule.id,
        });
        await updateDoc(doc(db, "officeSchedules", schedule.id), {
          status: "failed", executedAt: new Date().toISOString(), error: message,
        });
        results.push({ id: schedule.id, status: "failed", error: message });
      }
    }

    return res.status(200).json({ ok: true, checked: due.length, results });
  } catch (err) {
    console.error("[cron/office-schedules] failed", err);
    return res.status(500).json({ error: err.message || "排程檢查失敗" });
  }
}
