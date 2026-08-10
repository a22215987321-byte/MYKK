export function noteTitleFromSelection(value) {
  const firstLine = String(value || "").trim().split(/\r?\n/, 1)[0] || "";
  const title = firstLine
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return title.slice(0, 160) || "摘錄筆記";
}
