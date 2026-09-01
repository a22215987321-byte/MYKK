// 桌面版左右雙欄的登入／註冊畫面。這個檔案「只負責畫面」——所有 state、
// handler、Firebase 呼叫、登入成功後的流程全部留在 pages/index.js，這裡一律
// 從 props 進來。這樣重做 UI 不會動到既有的 authentication 架構。
//
// 顏色一律走既有主題變數（--bg／--panel／--accent…），沒有寫死任何色碼。
// 這是刻意的：右上角的主題切換鈕（components/ThemeToggle.js，floating 模式，
// 只在未登入時出現）切換 4 種風格＋柔和珠光的 6 種配色時，整個登入頁要跟著
// 變；如果這裡寫死暖米白＋橙色，那顆按鈕在登入頁就形同虛設。
//
// 刻意「沒有」做的東西（專案目前不存在，不做假按鈕）：
//   - 忘記密碼：全專案沒有 sendPasswordResetEmail／任何 reset 流程
//   - 隱私政策／使用條款：pages/ 底下沒有這些頁面
import { useState } from "react";

const AVATAR_EMOJIS = ["😊", "👨‍💻", "📚", "🏃", "🎮", "🎨", "🍜", "🌸", "🦊", "🐼", "🎧", "⚡"];
const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#06b6d4", "#84cc16"];

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// 左側裝飾：手機外框＋幾顆對話泡泡＋浮動頭像＋背後的柔光色塊。全部用 CSS／
// 既有的 avatar 圖檔組出來，沒有引用參考圖裡的人物照片。
function BrandArt() {
  return (
    <div className="as-art" aria-hidden="true">
      <div className="as-blob as-blob-1" />
      <div className="as-blob as-blob-2" />
      <div className="as-phone">
        <div className="as-phone-notch" />
        <div className="as-phone-head">
          <img src="/avatar2.png" alt="" className="as-phone-head-av" />
          <div>
            <div className="as-phone-title">好友群組</div>
            <div className="as-phone-sub">8 人在線</div>
          </div>
        </div>
        <div className="as-row">
          <img src="/avatar3.png" alt="" className="as-av-sm" />
          <div className="as-bubble">今天過得好嗎？</div>
        </div>
        <div className="as-row as-row-end">
          <div className="as-bubble as-bubble-me">很好啊！你呢？</div>
        </div>
        <div className="as-row">
          <img src="/avatar4.png" alt="" className="as-av-sm" />
          <div className="as-bubble">一起去喝咖啡吧</div>
        </div>
      </div>
      <img src="/avatar5.png" alt="" className="as-float as-float-1" />
      <img src="/avatar6.png" alt="" className="as-float as-float-2" />
      <div className="as-chip as-chip-heart">♥</div>
      <div className="as-chip as-chip-dots">• • •</div>
    </div>
  );
}

export default function AuthScreen({
  tab, setTab,
  email, setEmail,
  password, setPassword,
  nickname, setNickname,
  avatar, setAvatar,
  color, setColor,
  authError, setAuthError,
  busy,
  onLogin, onRegister, onGoogleLogin,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(null);
  const isLogin = tab === "login";

  // Enter 送出：登入模式跑 onLogin，註冊模式跑 onRegister，跟改版前一致。
  const submit = () => { if (!busy) { isLogin ? onLogin() : onRegister(); } };
  const onEnter = e => { if (e.key === "Enter") { e.preventDefault(); submit(); } };

  const switchTab = next => { setTab(next); setAuthError(""); };

  const field = name => ({
    width: "100%", height: 54, boxSizing: "border-box",
    background: "var(--panel-alt)",
    border: `1.5px solid ${focused === name ? "var(--accent)" : "var(--border)"}`,
    borderRadius: 14, padding: "0 16px", color: "var(--text)",
    fontSize: 15, outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    boxShadow: focused === name ? "0 0 0 4px color-mix(in srgb, var(--accent) 18%, transparent)" : "none",
  });

  return (
    <main className="as-root">
      <style>{`
        .as-root {
          min-height: 100dvh;
          display: grid;
          grid-template-columns: 55fr 45fr;
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-body);
          overflow-x: hidden;
        }
        /* 左欄：品牌與裝飾 */
        .as-left {
          position: relative;
          display: flex; flex-direction: column; justify-content: center;
          padding: 48px 56px;
          overflow: hidden;
          background:
            radial-gradient(circle at 18% 22%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 46%),
            radial-gradient(circle at 78% 78%, color-mix(in srgb, var(--accent-2) 12%, transparent), transparent 48%),
            var(--panel-alt);
        }
        .as-brand { display: flex; align-items: center; gap: 14px; margin-bottom: 26px; }
        .as-brand img { width: 56px; height: 56px; border-radius: 16px; flex-shrink: 0; }
        .as-brand-name { font-size: 27px; font-weight: 800; letter-spacing: 3px; color: var(--text); line-height: 1.1; }
        .as-brand-sub { font-size: 13px; color: var(--text-muted); margin-top: 3px; letter-spacing: 2px; }
        .as-headline { font-size: clamp(30px, 3.4vw, 46px); font-weight: 800; line-height: 1.25; margin: 0 0 18px; color: var(--text); }
        .as-headline span { color: var(--accent); display: block; }
        .as-sub { font-size: 15px; line-height: 1.9; color: var(--text-muted); margin: 0; }

        /* 左欄裝飾 */
        .as-art { position: relative; margin-top: 34px; height: 300px; }
        .as-blob { position: absolute; border-radius: 50%; filter: blur(46px); }
        .as-blob-1 { width: 230px; height: 230px; left: -40px; top: 10px; background: color-mix(in srgb, var(--accent) 34%, transparent); }
        .as-blob-2 { width: 190px; height: 190px; right: 20px; bottom: -10px; background: color-mix(in srgb, var(--accent-2) 30%, transparent); }
        .as-phone {
          position: absolute; left: 50%; transform: translateX(-50%) rotate(-3deg);
          top: 0; width: 210px; padding: 16px 12px 14px;
          background: var(--panel); border: 1px solid var(--border);
          border-radius: 26px; box-shadow: 0 18px 42px color-mix(in srgb, var(--text) 16%, transparent);
        }
        .as-phone-notch { width: 46px; height: 4px; border-radius: 3px; background: var(--border); margin: 0 auto 12px; }
        .as-phone-head { display: flex; align-items: center; gap: 8px; padding-bottom: 10px; border-bottom: 1px solid var(--border); margin-bottom: 10px; }
        .as-phone-head-av { width: 26px; height: 26px; border-radius: 50%; object-fit: cover; }
        .as-phone-title { font-size: 12px; font-weight: 700; color: var(--text); }
        .as-phone-sub { font-size: 10px; color: var(--text-faint); }
        .as-row { display: flex; align-items: flex-end; gap: 6px; margin-bottom: 8px; }
        .as-row-end { justify-content: flex-end; }
        .as-av-sm { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .as-bubble {
          background: var(--panel-alt); border: 1px solid var(--border);
          border-radius: 12px 12px 12px 4px; padding: 7px 10px; font-size: 11px; color: var(--text);
        }
        .as-bubble-me {
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: var(--accent-text, #fff); border: none; border-radius: 12px 12px 4px 12px;
        }
        .as-float {
          position: absolute; border-radius: 50%; object-fit: cover;
          border: 3px solid var(--panel);
          box-shadow: 0 10px 24px color-mix(in srgb, var(--text) 18%, transparent);
        }
        .as-float-1 { width: 62px; height: 62px; left: 6px; top: 74px; }
        .as-float-2 { width: 68px; height: 68px; right: 8px; bottom: 46px; }
        .as-chip {
          position: absolute; display: flex; align-items: center; justify-content: center;
          border-radius: 16px 16px 16px 5px;
          box-shadow: 0 10px 22px color-mix(in srgb, var(--text) 14%, transparent);
        }
        .as-chip-heart {
          width: 46px; height: 42px; right: 26px; top: 30px; font-size: 19px;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: var(--accent-text, #fff);
        }
        .as-chip-dots {
          width: 56px; height: 40px; right: 54px; top: 104px; font-size: 13px; letter-spacing: 1px;
          background: var(--panel); color: var(--text-faint); border: 1px solid var(--border);
        }

        /* 右欄：登入卡 */
        .as-right {
          display: flex; align-items: center; justify-content: center;
          padding: 40px 32px;
        }
        .as-card {
          width: 100%; max-width: 530px;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 26px;
          padding: 40px 40px 34px;
          box-shadow: 0 22px 60px color-mix(in srgb, var(--text) 12%, transparent);
          box-sizing: border-box;
        }
        .as-title { font-size: 27px; font-weight: 800; margin: 0 0 8px; color: var(--text); }
        .as-card-sub { font-size: 14px; color: var(--text-muted); margin: 0 0 26px; }
        .as-label { display: block; font-size: 13px; font-weight: 600; color: var(--text-muted); margin-bottom: 7px; }
        .as-eye {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;
          background: none; border: none; cursor: pointer; color: var(--text-faint);
          border-radius: 10px; font-size: 17px; line-height: 1;
        }
        .as-eye:hover { background: var(--panel-hover); color: var(--text); }
        .as-submit {
          width: 100%; height: 54px; border: none; border-radius: 14px;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: var(--accent-text, #fff); font-size: 16px; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: filter 0.15s, transform 0.06s;
        }
        .as-submit:hover:not(:disabled) { filter: brightness(1.06); }
        .as-submit:active:not(:disabled) { transform: translateY(1px); }
        .as-submit:disabled { opacity: 0.62; cursor: not-allowed; }
        .as-spin {
          width: 17px; height: 17px; border-radius: 50%;
          border: 2px solid color-mix(in srgb, var(--accent-text, #fff) 45%, transparent);
          border-top-color: var(--accent-text, #fff);
          animation: as-rotate 0.7s linear infinite;
        }
        @keyframes as-rotate { to { transform: rotate(360deg); } }
        .as-or { display: flex; align-items: center; gap: 14px; margin: 22px 0; }
        .as-or::before, .as-or::after { content: ""; flex: 1; height: 1px; background: var(--border); }
        .as-or span { font-size: 13px; color: var(--text-faint); }
        .as-google {
          width: 100%; height: 54px; border-radius: 14px;
          background: var(--panel-alt); border: 1.5px solid var(--border);
          display: flex; align-items: center; justify-content: center; gap: 12px;
          font-size: 15px; font-weight: 600; color: var(--text); cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .as-google:hover { background: var(--panel-hover); border-color: var(--accent); }
        .as-swap { text-align: center; margin-top: 24px; font-size: 14px; color: var(--text-muted); }
        .as-swap button {
          background: none; border: none; cursor: pointer; padding: 0 0 0 6px;
          color: var(--accent); font-size: 14px; font-weight: 700;
        }
        .as-swap button:hover { text-decoration: underline; }
        .as-foot { text-align: center; margin-top: 22px; font-size: 12px; color: var(--text-faint); }

        /* 平板：左欄縮小 */
        @media (max-width: 1100px) {
          .as-left { padding: 40px 36px; }
          .as-art { height: 250px; }
          .as-card { padding: 34px 30px 30px; }
        }
        /* 手機：改單欄，左欄只留品牌，裝飾整個拿掉避免溢出 */
        @media (max-width: 860px) {
          .as-root { grid-template-columns: 1fr; }
          .as-left {
            /* 上內距要留出右上角主題膠囊鈕（ThemeToggle floating，fixed top:12
               height:42）的高度，否則手機版會蓋住 EVONCHAT 字樣。 */
            padding: 68px 22px 22px;
            text-align: center;
            background: var(--panel-alt);
          }
          .as-brand { justify-content: center; margin-bottom: 14px; }
          .as-brand img { width: 46px; height: 46px; }
          .as-brand-name { font-size: 22px; }
          .as-headline { font-size: 25px; margin-bottom: 10px; }
          .as-headline span { display: inline; }
          .as-sub { font-size: 14px; line-height: 1.7; }
          .as-art { display: none; }
          .as-right { padding: 22px 16px 34px; }
          .as-card { border: none; box-shadow: none; background: transparent; padding: 4px 0 0; max-width: 460px; }
          .as-title { font-size: 23px; }
        }
      `}</style>

      {/* ── 左欄：品牌 ── */}
      <section className="as-left">
        <div className="as-brand">
          <img src="/logo.png?v=3" alt="" aria-hidden="true" />
          <div>
            <div className="as-brand-name">EVONCHAT</div>
            <div className="as-brand-sub">聊天社交平台</div>
          </div>
        </div>
        <h1 className="as-headline">
          與重要的人
          <span>保持聯繫</span>
        </h1>
        <p className="as-sub">
          聊天、分享生活，與朋友保持連結
          <br />
          讓每一次對話都更有溫度
        </p>
        <BrandArt />
      </section>

      {/* ── 右欄：登入／註冊卡 ── */}
      <section className="as-right">
        <div className="as-card">
          <h2 className="as-title">{isLogin ? "歡迎回來 👋" : "建立你的帳戶 ✨"}</h2>
          <p className="as-card-sub">
            {isLogin ? "登入你的帳戶，繼續與朋友保持聯繫" : "填好基本資料，馬上開始聊天"}
          </p>

          {/* 註冊模式：頭像＋底色（沿用改版前既有欄位，沒有刪任何一個） */}
          {!isLogin && (
            <div style={{ marginBottom: 18 }}>
              <span id="as-avatar-label" className="as-label">選擇頭像</span>
              <div role="group" aria-labelledby="as-avatar-label" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {AVATAR_EMOJIS.map(e => (
                  <button key={e} type="button" onClick={() => setAvatar(e)}
                    aria-label={`頭像 ${e}`} aria-pressed={avatar === e}
                    style={{
                      width: 40, height: 40, borderRadius: "50%", cursor: "pointer", fontSize: 19,
                      background: color,
                      border: avatar === e ? "2.5px solid var(--accent)" : "2.5px solid transparent",
                      boxShadow: avatar === e ? "0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent)" : "none",
                    }}>{e}</button>
                ))}
              </div>
              <div role="group" aria-label="選擇頭像底色" style={{ display: "flex", gap: 7 }}>
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    aria-label={`底色 ${c}`} aria-pressed={color === c}
                    style={{
                      width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer",
                      border: color === c ? "2.5px solid var(--text)" : "2.5px solid transparent",
                    }} />
                ))}
              </div>
            </div>
          )}

          {!isLogin && (
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="as-nickname" className="as-label">暱稱</label>
              <input id="as-nickname" value={nickname} onChange={e => setNickname(e.target.value)}
                onKeyDown={onEnter} onFocus={() => setFocused("nickname")} onBlur={() => setFocused(null)}
                placeholder="你的暱稱" style={field("nickname")} />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="as-email" className="as-label">電子郵件</label>
            <input id="as-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={onEnter} onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
              autoComplete="email" placeholder="your@email.com" style={field("email")} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label htmlFor="as-password" className="as-label">密碼</label>
            <div style={{ position: "relative" }}>
              <input id="as-password" type={showPassword ? "text" : "password"}
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={onEnter} onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
                autoComplete={isLogin ? "current-password" : "new-password"}
                placeholder="••••••••"
                style={{ ...field("password"), paddingRight: 52 }} />
              <button type="button" className="as-eye"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? "隱藏密碼" : "顯示密碼"}
                aria-pressed={showPassword}>
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {authError && (
            <div role="alert" style={{
              background: "color-mix(in srgb, #ef4444 12%, var(--panel-alt))",
              border: "1px solid color-mix(in srgb, #ef4444 45%, var(--border))",
              borderRadius: 12, padding: "11px 14px", color: "#dc2626",
              fontSize: 13.5, marginBottom: 18, fontWeight: 600,
            }}>
              {authError}
            </div>
          )}

          <button className="as-submit" onClick={submit} disabled={busy}>
            {busy && <span className="as-spin" aria-hidden="true" />}
            {busy ? "處理中..." : (isLogin ? "登入" : "建立帳號")}
          </button>

          <div className="as-or"><span>或</span></div>

          <button className="as-google" onClick={onGoogleLogin} disabled={busy}>
            <GoogleMark />
            使用 Google 繼續
          </button>

          <div className="as-swap">
            {isLogin ? "還沒有帳戶？" : "已經有帳戶？"}
            <button type="button" onClick={() => switchTab(isLogin ? "register" : "login")}>
              {isLogin ? "立即註冊" : "登入"}
            </button>
          </div>

          <div className="as-foot">© 2026 EVONCHAT. All rights reserved.</div>
        </div>
      </section>
    </main>
  );
}
