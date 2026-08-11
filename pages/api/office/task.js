import { runOfficeTask, safeError } from "../../../lib/officeTaskEngine";

// AI Office 真實任務執行——邏輯搬到 lib/officeTaskEngine.js（跟日程排程的
// pages/api/cron/office-schedules.js 共用），這支只負責驗證輸入跟回應。
const MAX_TITLE = 200;
const MAX_BRIEF = 10_000;

const VALID_AGENTS = new Set(["strategy-agent", "intelligence-agent", "brand-agent", "systems-agent", "analytics-agent", "creative-agent"]);

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { title, assigneeId, brief, kind, targetDate, agentInstruction } = req.body || {};
    const cleanTitle = String(title || "").trim().slice(0, MAX_TITLE);
    const cleanBrief = String(brief || "").trim().slice(0, MAX_BRIEF);
    const cleanAssignee = VALID_AGENTS.has(assigneeId) ? assigneeId : "analytics-agent";
    const cleanTargetDate = /^\d{4}-\d{2}-\d{2}$/.test(String(targetDate || "")) ? String(targetDate) : "";
    const cleanInstruction = typeof agentInstruction === "string" ? agentInstruction.slice(0, MAX_BRIEF) : "";
    if (!cleanTitle) return res.status(400).json({ error: "請輸入任務名稱。" });

    if (kind === "browser") {
      return res.status(400).json({ error: "本機工具操作只支援 AI Office 桌面版，網頁版無法開啟本機瀏覽器。" });
    }

    const output = await runOfficeTask({
      title: cleanTitle, brief: cleanBrief, assigneeId: cleanAssignee,
      kind: kind === "github" ? "github" : "standard", targetDate: cleanTargetDate, agentInstruction: cleanInstruction,
    });

    return res.json(output);
  } catch (error) {
    console.error("office/task error:", error);
    return res.status(400).json({ error: safeError(error) });
  }
}
