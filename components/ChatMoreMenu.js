import NavItem from "./nav/NavItem";
import NavLinkItem from "./nav/NavLinkItem";

// Mobile-only "更多" tab: collects the non-chat features that live in the
// desktop sidebar (leaderboard, cinema, language-learning tools, dictionary).
export default function ChatMoreMenu({ state, setters, onOpen }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--panel-alt)", overflowY: "auto", minHeight: 0 }}>
      <div style={{ padding: "10px 10px 6px" }}>
        <NavItem icon="🏆" iconBg="linear-gradient(135deg,#f59e0b,#fbbf24,#d97706)" label="排行榜" sublabel="積分排名" mobileTouch
          active={state.showLeaderboard} onClick={() => onOpen(setters.setShowLeaderboard)} />
      </div>
      <div style={{ padding: "0 10px 10px" }}>
        <NavItem icon="🎬" iconBg="linear-gradient(135deg,var(--accent-hover),#2563eb)" label="電影院" sublabel="同步觀看影片" mobileTouch
          active={state.showCinema} onClick={() => onOpen(setters.setShowCinema)} />
      </div>

      <div style={{ padding: "4px 14px 4px" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase" }}>🇬🇧 英語學習</span>
      </div>
      <div style={{ padding: "0 10px 6px" }}>
        <NavItem icon="🔤" iconBg="linear-gradient(135deg,#1e3a5f,#3b82f6)" label="英語發音" sublabel="音標・母音・子音" mobileTouch
          active={state.showEnglishPron} onClick={() => onOpen(setters.setShowEnglishPron)} />
      </div>
      <div style={{ padding: "0 10px 6px" }}>
        <NavItem icon="🎯" iconBg="linear-gradient(135deg,#1e3a1e,#6366f1)" label="IELTS 4.0 入門" sublabel="詞彙・聽力・口說" mobileTouch
          active={state.showIeltsBand4} onClick={() => onOpen(setters.setShowIeltsBand4)} />
      </div>
      <div style={{ padding: "0 10px 10px" }}>
        <NavItem icon="📚" iconBg="linear-gradient(135deg,#065f46,#10b981)" label="IELTS 詞彙" sublabel="IELTS 單字練習" mobileTouch
          active={state.showVocab} onClick={() => onOpen(setters.setShowVocab)} />
      </div>

      <div style={{ padding: "4px 14px 4px" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase" }}>🇪🇸 西班牙語</span>
      </div>
      <div style={{ padding: "0 10px 6px" }}>
        <NavItem icon="🇪🇸" iconBg="linear-gradient(135deg,#7c1d1d,#dc2626)" label="西班牙語學習" sublabel="CEFR A1/A2" mobileTouch
          active={state.showSpanish} onClick={() => onOpen(setters.setShowSpanish)} />
      </div>
      <div style={{ padding: "0 10px 6px" }}>
        <NavItem icon="🗺️" iconBg="linear-gradient(135deg,#1e1b4b,#6366f1)" label="西語 A1 路線" sublabel="初學者情境課程" mobileTouch
          active={state.showSpanishCourse} onClick={() => onOpen(setters.setShowSpanishCourse)} />
      </div>
      <div style={{ padding: "0 10px 6px" }}>
        <NavItem icon="🔤" iconBg="linear-gradient(135deg,#7c1d1d,#b91c1c)" label="西語發音" sublabel="母音 · 子音 · 重音" mobileTouch
          active={state.showSpanishPron} onClick={() => onOpen(setters.setShowSpanishPron)} />
      </div>
      <div style={{ padding: "0 10px 6px" }}>
        <NavItem icon="📐" iconBg="linear-gradient(135deg,#14532d,#16a34a)" label="西語文法" sublabel="ser/estar · 代詞 · 動詞" mobileTouch
          active={state.showSpanishGrammar} onClick={() => onOpen(setters.setShowSpanishGrammar)} />
      </div>
      <div style={{ padding: "0 10px 10px" }}>
        <NavItem icon="🧩" iconBg="linear-gradient(135deg,#7c2d12,#dc2626)" label="西語動詞變位" sublabel="完整變位查詢" mobileTouch
          active={state.showSpanishVerbs} onClick={() => onOpen(setters.setShowSpanishVerbs)} />
      </div>

      <div style={{ padding: "4px 14px 4px" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase" }}>🇫🇷 法語學習</span>
      </div>
      <div style={{ padding: "0 10px 6px" }}>
        <NavLinkItem href="/french/pronunciation" icon="🔤" iconBg="linear-gradient(135deg,#1e3a5f,#3b82f6)" label="法語發音" sublabel="母音・鼻母音・子音" />
      </div>
      <div style={{ padding: "0 10px 6px" }}>
        <NavLinkItem href="/french/grammar" icon="📐" iconBg="linear-gradient(135deg,#14532d,#16a34a)" label="法語文法" sublabel="核心文法規則" />
      </div>
      <div style={{ padding: "0 10px 10px" }}>
        <NavLinkItem href="/french/a1" icon="🗺️" iconBg="linear-gradient(135deg,#1e1b4b,#6366f1)" label="法語 A1" sublabel="A1 常用詞彙" />
      </div>

      <div style={{ padding: "0 10px 6px" }}>
        <NavItem icon="✏️" iconBg="linear-gradient(135deg,var(--accent-hover),#7c3aed)" label="自定詞彙" sublabel="建立個人單字本" mobileTouch
          active={state.showCustomVocab} onClick={() => onOpen(setters.setShowCustomVocab)} />
      </div>
      <div style={{ padding: "0 10px 16px" }}>
        <NavItem icon="📖" iconBg="linear-gradient(135deg,#0f2e1c,#166534)" label="字典" sublabel="英・西・法 A-Z" mobileTouch
          active={state.showDict} onClick={() => onOpen(setters.setShowDict)} />
      </div>
    </div>
  );
}
