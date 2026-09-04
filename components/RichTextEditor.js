import { useEffect, useState, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Undo2, Redo2, Search, Type, Palette, X,
} from "lucide-react";

// 專案檔案庫的所見即所得編輯器。原本是一個編輯 Markdown 的 textarea，但
// Markdown 這個格式本身沒有底線、對齊、文字顏色、任意字級這四樣東西，所以
// 換成 Tiptap（ProseMirror）、內容改存 HTML。
//
// 舊文件相容：ProjectFilesPanel 會看 doc 的 format 欄位，沒有這個欄位的就是
// 以前存的 Markdown，先用 marked 轉成 HTML 再餵進來，存檔時寫入
// format:"html"。所以舊檔打開就會被就地升級，不需要另外跑一次資料轉檔。

// Tiptap 沒有官方的字級擴充，自己補一個掛在 TextStyle 上——就是把
// style="font-size: Npx" 這個屬性讀寫成一個可以套用/取消的 mark。
const FontSize = Extension.create({
  name: "fontSize",
  addOptions() { return { types: ["textStyle"] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el) => el.style.fontSize?.replace(/['"]/g, "") || null,
          renderHTML: (attrs) => (attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {}),
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (size) => ({ chain }) => chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }) =>
        chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "30px", "36px"];
const COLORS = [
  { v: null, label: "預設" },
  { v: "#dc2626", label: "紅" },
  { v: "#ea580c", label: "橙" },
  { v: "#ca8a04", label: "黃" },
  { v: "#16a34a", label: "綠" },
  { v: "#2563eb", label: "藍" },
  { v: "#7c3aed", label: "紫" },
  { v: "#6b7280", label: "灰" },
];

function Btn({ on, disabled, title, onClick, children }) {
  return (
    <button type="button" title={title} disabled={disabled}
      className={"rte-btn" + (on ? " on" : "")}
      // 用 onMouseDown + preventDefault 而不是 onClick：按下工具列按鈕時
      // 不能讓編輯器失焦，否則選取範圍會消失，套用格式就沒有目標了。
      onMouseDown={(e) => { e.preventDefault(); if (!disabled) onClick(); }}>
      {children}
    </button>
  );
}

export default function RichTextEditor({ value, onChange, onBlur }) {
  const [, force] = useState(0);
  const [findOpen, setFindOpen] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [findMsg, setFindMsg] = useState("");
  const [menu, setMenu] = useState(null); // "size" | "color" | null
  const lastValueRef = useRef(value);

  const editor = useEditor({
    immediatelyRender: false, // Next.js SSR：不要在伺服器端就渲染
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastValueRef.current = html;
      onChange?.(html);
    },
    onBlur: () => onBlur?.(),
    // 工具列的 on/off 狀態要跟著游標位置更新，不然按鈕不會亮
    onSelectionUpdate: () => force((n) => n + 1),
    onTransaction: () => force((n) => n + 1),
  });

  // 切換檔案時把新內容灌進編輯器。比對 lastValueRef 是為了避免把自己剛打的
  // 字又設定回去一次（那會把游標踢到開頭）。
  useEffect(() => {
    if (!editor) return;
    if (value === lastValueRef.current) return;
    lastValueRef.current = value;
    editor.commands.setContent(value || "", { emitUpdate: false });
  }, [value, editor]);

  const runFind = useCallback((all) => {
    if (!editor || !findText) return;
    const html = editor.getHTML();
    // 只在純文字層面做取代，不碰標籤，避免把 <p style="..."> 裡的字串也換掉
    const parts = html.split(/(<[^>]*>)/g);
    let count = 0;
    const next = parts.map((seg) => {
      if (seg.startsWith("<")) return seg;
      if (!seg.includes(findText)) return seg;
      if (all) {
        count += seg.split(findText).length - 1;
        return seg.split(findText).join(replaceText);
      }
      if (count === 0 && seg.includes(findText)) {
        count = 1;
        return seg.replace(findText, replaceText);
      }
      return seg;
    }).join("");
    if (!count) { setFindMsg("找不到「" + findText + "」"); return; }
    editor.commands.setContent(next, { emitUpdate: true });
    setFindMsg("已取代 " + count + " 處");
  }, [editor, findText, replaceText]);

  if (!editor) return <div className="rte-loading">載入編輯器…</div>;

  const curSize = editor.getAttributes("textStyle").fontSize || null;
  const curColor = editor.getAttributes("textStyle").color || null;

  return (
    <div className="rte-root">
      <div className="rte-bar">
        {/* 復原／取消復原：Tiptap 的 History 擴充自己維護堆疊，工具列按鈕
            跟 Ctrl+Z 走同一套，不會像 textarea 那樣被程式化改值弄壞。 */}
        <Btn title="復原 (Ctrl+Z)" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={16} /></Btn>
        <Btn title="取消復原 (Ctrl+Y)" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={16} /></Btn>
        <span className="rte-div" />

        <Btn title="粗體 (Ctrl+B)" on={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></Btn>
        <Btn title="斜體 (Ctrl+I)" on={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></Btn>
        <Btn title="底線 (Ctrl+U)" on={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={16} /></Btn>
        <Btn title="刪除線" on={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={16} /></Btn>
        <span className="rte-div" />

        <Btn title="靠左" on={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft size={16} /></Btn>
        <Btn title="置中" on={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter size={16} /></Btn>
        <Btn title="靠右" on={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight size={16} /></Btn>
        <Btn title="左右對齊" on={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}><AlignJustify size={16} /></Btn>
        <span className="rte-div" />

        <Btn title="項目符號" on={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={16} /></Btn>
        <Btn title="數字編號" on={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></Btn>
        <span className="rte-div" />

        {/* 文字大小 */}
        <div className="rte-pop-wrap">
          <Btn title="文字大小" on={!!curSize || menu === "size"} onClick={() => setMenu(menu === "size" ? null : "size")}><Type size={16} /></Btn>
          {menu === "size" && (
            <div className="rte-pop">
              <button className={!curSize ? "on" : ""}
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().unsetFontSize().run(); setMenu(null); }}>預設</button>
              {FONT_SIZES.map((s) => (
                <button key={s} className={curSize === s ? "on" : ""}
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setFontSize(s).run(); setMenu(null); }}>
                  <span style={{ fontSize: Math.min(parseInt(s, 10), 20) }}>{parseInt(s, 10)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 文字顏色 */}
        <div className="rte-pop-wrap">
          <Btn title="文字顏色" on={!!curColor || menu === "color"} onClick={() => setMenu(menu === "color" ? null : "color")}>
            <Palette size={16} />
            {curColor && <span className="rte-swatch" style={{ background: curColor }} />}
          </Btn>
          {menu === "color" && (
            <div className="rte-pop rte-pop-color">
              {COLORS.map((c) => (
                <button key={c.label} title={c.label} className={curColor === c.v ? "on" : ""}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (c.v) editor.chain().focus().setColor(c.v).run();
                    else editor.chain().focus().unsetColor().run();
                    setMenu(null);
                  }}>
                  <span className="rte-dot" style={{ background: c.v || "var(--text)", opacity: c.v ? 1 : 0.35 }} />
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="rte-div" />

        <Btn title="尋找與取代" on={findOpen} onClick={() => { setFindOpen((v) => !v); setFindMsg(""); }}><Search size={16} /></Btn>
      </div>

      {findOpen && (
        <div className="rte-find">
          <input value={findText} onChange={(e) => { setFindText(e.target.value); setFindMsg(""); }} placeholder="尋找" autoFocus />
          <input value={replaceText} onChange={(e) => setReplaceText(e.target.value)} placeholder="取代為" />
          <button onMouseDown={(e) => { e.preventDefault(); runFind(false); }}>取代一個</button>
          <button onMouseDown={(e) => { e.preventDefault(); runFind(true); }}>全部取代</button>
          {findMsg && <span className="rte-findmsg">{findMsg}</span>}
          <span style={{ flex: 1 }} />
          <button className="rte-findclose" onMouseDown={(e) => { e.preventDefault(); setFindOpen(false); }}><X size={14} /></button>
        </div>
      )}

      <EditorContent editor={editor} className="rte-body" />

      <style>{`
        .rte-root { display: flex; flex-direction: column; height: 100%; min-height: 0; }
        .rte-loading { padding: 24px; color: var(--text-faint); font-size: 13px; }
        .rte-bar {
          display: flex; align-items: center; gap: 1px; flex-wrap: wrap;
          padding: 6px 8px; border-bottom: 1px solid var(--border-soft); flex-shrink: 0;
        }
        .rte-btn {
          display: flex; align-items: center; justify-content: center; position: relative;
          width: 30px; height: 30px; border: none; background: none; border-radius: 7px;
          color: var(--text-muted); cursor: pointer;
        }
        .rte-btn:hover:not(:disabled) { background: var(--panel-hover); color: var(--text); }
        .rte-btn.on { background: var(--panel-hover); color: var(--accent); }
        .rte-btn:disabled { opacity: 0.3; cursor: default; }
        .rte-div { width: 1px; height: 18px; background: var(--border-soft); margin: 0 5px; flex-shrink: 0; }
        .rte-swatch { position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%);
          width: 13px; height: 2.5px; border-radius: 2px; }

        .rte-pop-wrap { position: relative; }
        .rte-pop {
          position: absolute; top: 34px; left: 0; z-index: 30;
          background: var(--panel); border: 1px solid var(--border);
          border-radius: 10px; padding: 5px; display: flex; flex-direction: column; gap: 1px;
          box-shadow: 0 10px 28px rgba(0,0,0,0.18); min-width: 74px;
        }
        .rte-pop button {
          border: none; background: none; border-radius: 6px; padding: 5px 9px;
          color: var(--text); cursor: pointer; font-size: 13px; text-align: left;
          display: flex; align-items: center; gap: 7px;
        }
        .rte-pop button:hover { background: var(--panel-hover); }
        .rte-pop button.on { background: var(--panel-hover); color: var(--accent); font-weight: 600; }
        .rte-pop-color { flex-direction: row; flex-wrap: wrap; width: 118px; }
        .rte-pop-color button { padding: 5px; }
        .rte-dot { width: 18px; height: 18px; border-radius: 50%; display: block;
          border: 1px solid rgba(0,0,0,0.12); }

        .rte-find {
          display: flex; align-items: center; gap: 7px; flex-wrap: wrap;
          padding: 7px 9px; border-bottom: 1px solid var(--border-soft);
          background: var(--panel-alt); flex-shrink: 0;
        }
        .rte-find input {
          height: 30px; border: 1px solid var(--border); border-radius: 8px;
          background: var(--panel); color: var(--text); font-size: 13px; padding: 0 9px;
          outline: none; width: 130px;
        }
        .rte-find input:focus { border-color: var(--accent); }
        .rte-find button {
          height: 30px; padding: 0 11px; border: 1px solid var(--border); border-radius: 8px;
          background: var(--panel); color: var(--text); font-size: 12.5px; cursor: pointer;
        }
        .rte-find button:hover { background: var(--panel-hover); }
        .rte-findclose { width: 30px; padding: 0 !important; display: flex;
          align-items: center; justify-content: center; }
        .rte-findmsg { font-size: 12px; color: var(--text-faint); }

        .rte-body { flex: 1; min-height: 0; overflow-y: auto; padding: 20px 24px 40px; }
        /* 字體／字級／字重／行距刻意跟 ProjectFilesPanel 的 .pf-doc 完全一致。
           在此之前這裡沒有宣告 font-family，會繼承成 --font-body（黑體），而
           閱讀模式是襯線——同一份文件在兩個模式下長得不一樣，切換時整段文字
           會跳掉。對齊之後，編輯看到的就是最後讀到的樣子。 */
        /* max-width 與 margin:0 auto 跟 .pf-doc 對齊——面板最大化或左欄收合時
           編輯區也會變得很寬，不限寬的話一行會拉得比閱讀模式長很多，切換模式
           就會看到整段重新斷行。 */
        .rte-body .ProseMirror { outline: none; min-height: 100%;
          /* PfLiningNum 在 ProjectFilesPanel 裡宣告（@font-face 是整份文件共用），
             這個編輯器只會出現在那個面板內，所以直接引用。閱讀模式跟編輯模式
             的字體必須完全一樣，切換時才不會跳動。 */
          font-family: "PfLiningNum", Georgia, "Times New Roman", "Noto Serif TC", serif;
          font-variant-numeric: lining-nums;
          font-size: 18px; font-weight: 500; line-height: 1.85; color: var(--text);
          max-width: 74ch; margin: 0 auto; }
        .rte-body .ProseMirror > *:first-child { margin-top: 0; }
        .rte-body .ProseMirror p { margin: 0 0 0.9em; }
        .rte-body .ProseMirror strong { font-weight: 800; }
        .rte-body .ProseMirror h1 { font-size: 1.85em; font-weight: 800; margin: 1.3em 0 0.45em; }
        .rte-body .ProseMirror h2 { font-size: 1.5em; font-weight: 800; margin: 1.25em 0 0.4em; }
        .rte-body .ProseMirror h3 { font-size: 1.22em; font-weight: 800; margin: 1.2em 0 0.35em; }
        .rte-body .ProseMirror ul { list-style: disc; padding-left: 1.5em; margin: 0 0 0.9em; }
        .rte-body .ProseMirror ol { padding-left: 1.5em; margin: 0 0 0.9em; }
        .rte-body .ProseMirror li { margin-bottom: 0.3em; }
        .rte-body .ProseMirror blockquote { margin: 0 0 0.9em; padding-left: 1em;
          border-left: 3px solid var(--border); color: var(--text-muted); }
        .rte-body .ProseMirror code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.87em; background: var(--panel-alt); padding: 2px 5px; border-radius: 5px; }
        .rte-body .ProseMirror pre { background: var(--panel-alt); padding: 13px 15px;
          border-radius: 10px; overflow-x: auto; margin: 0 0 0.9em; }
        .rte-body .ProseMirror pre code { background: none; padding: 0; }
        .rte-body .ProseMirror hr { border: none; border-top: 1px solid var(--border); margin: 1.5em 0; }
        .rte-body .ProseMirror a { color: var(--accent); text-decoration: underline; }
        .rte-body::-webkit-scrollbar { width: 6px; }
        .rte-body::-webkit-scrollbar-track { background: transparent; }
        .rte-body::-webkit-scrollbar-thumb { background: var(--text-dim); border-radius: 3px; }
      `}</style>
    </div>
  );
}
