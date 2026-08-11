// 共用常數，OfficeMode.js 跟 Workspace.js 都會用到——拆出來獨立一個檔案
// 避免兩邊互相 import 造成循環依賴。id 要跟
// components/office/src/scene/layout/officeLayout.ts 的 AGENT_ROSTER 一致
// （intelligence-agent／systems-agent 是動畫套件那次改名後的新 id）。
export const AGENTS = [
  { id: "strategy-agent", name: "若晴", role: "策略協調師", specialty: "拆解目標、協調團隊與交付路線" },
  { id: "intelligence-agent", name: "澄音", role: "AI 情報整合師", specialty: "彙整市場、GitHub 與研究訊號" },
  { id: "brand-agent", name: "璃亞", role: "品牌敘事師", specialty: "品牌定位、內容企劃與產品敘事" },
  { id: "systems-agent", name: "景曜", role: "系統整合架構師", specialty: "工作流程、自動化與跨平台整合" },
  { id: "analytics-agent", name: "阿衡", role: "數據與品管分析師", specialty: "數據分析、異常檢查與品質把關" },
  { id: "creative-agent", name: "老墨", role: "創意總監", specialty: "創意方向、提案故事與視覺概念" },
];

export const COLOR_CYCLE = ["blue", "gold", "purple", "green"];

export function agentById(id) {
  return AGENTS.find((agent) => agent.id === id);
}

export function statusLabel(status) {
  return { running: "AI 執行中", completed: "已完成", failed: "執行失敗" }[status] || status;
}

export function dateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export async function apiRequest(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `服務錯誤（${response.status}）`);
  return data;
}
