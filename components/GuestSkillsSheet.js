import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, BookOpen, FileText, Languages, Lightbulb, ListChecks, PenLine, Search, X } from "lucide-react";
import { filterGuestSkills } from "../lib/guestSkills";
import styles from "./GuestSkillsSheet.module.css";

const ICONS = { summary: FileText, write: PenLine, translate: Languages, plan: ListChecks, ideas: Lightbulb, explain: BookOpen };
export function GuestSkillIcon({ name, size = 20 }) {
  const Icon = ICONS[name] || FileText;
  return <Icon size={size} strokeWidth={1.7} aria-hidden="true" />;
}

export default function GuestSkillsSheet({ open, onClose, onSelect }) {
  const dialogRef = useRef(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    const viewport = window.visualViewport;
    const updateHeight = () => dialog.style.setProperty("--skills-viewport-height", `${viewport?.height || window.innerHeight}px`);
    setSearch("");
    updateHeight();
    viewport?.addEventListener("resize", updateHeight);
    window.addEventListener("resize", updateHeight);
    dialog.showModal();
    return () => {
      viewport?.removeEventListener("resize", updateHeight);
      window.removeEventListener("resize", updateHeight);
      dialog.close();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;
  const skills = filterGuestSkills(search);

  return createPortal(
    <dialog ref={dialogRef} className={styles.sheet} aria-labelledby="guest-skills-title" aria-describedby="guest-skills-description"
      onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={styles.panel}>
        <div className={styles.handle} aria-hidden="true" />
        <header className={styles.header}>
          <div><span className={styles.eyebrow}>EVON WORKSPACE</span><h2 id="guest-skills-title">Skills <span>任務範本</span></h2></div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="關閉 Skills" autoFocus><X size={20} /></button>
        </header>
        <p id="guest-skills-description" className={styles.description}>選一個起點，補上你的內容，再傳送到對話。</p>
        <label className={styles.search}><Search size={18} aria-hidden="true" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="搜尋任務範本" aria-label="搜尋 Skills" /></label>
        <div className={styles.list}>
          {skills.map(skill => <button type="button" key={skill.id} className={styles.card} onClick={() => onSelect(skill.id)}>
            <span className={styles.icon}><GuestSkillIcon name={skill.icon} /></span>
            <span className={styles.copy}><strong>{skill.title}</strong><span>{skill.description}</span></span>
            <ArrowUpRight size={16} className={styles.arrow} aria-hidden="true" />
          </button>)}
          {skills.length === 0 && <p className={styles.empty} role="status">沒有符合的範本，試試「寫作」或「規劃」。</p>}
        </div>
        <p className={styles.note}>目前提供可編輯的指令範本，不會自動執行工具或產生檔案。</p>
      </section>
    </dialog>, document.body,
  );
}
