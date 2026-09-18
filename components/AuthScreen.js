// Presentation only: authentication, validation and navigation stay in pages/index.js.
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./AuthScreen.module.css";

const AVATAR_EMOJIS = ["😊", "👨‍💻", "📚", "🏃", "🎮", "🎨", "🍜", "🌸", "🦊", "🐼", "🎧", "⚡"];
const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#06b6d4", "#84cc16"];

function Brand() {
  return (
    <div className={styles.brand}>
      <img src="/logo.png?v=3" width="48" height="48" alt="" aria-hidden="true" />
      <div>
        <div className={styles.brandName}>EVONCHAT</div>
        <div className={styles.brandSub}>聊天社交平台</div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function AuthScreen({
  tab, setTab, email, setEmail, password, setPassword,
  nickname, setNickname, avatar, setAvatar, color, setColor,
  authError, setAuthError, busy, guestBusy,
  onLogin, onRegister, onGoogleLogin, onGuestLogin,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isLogin = tab === "login";
  const formBusy = busy || guestBusy;
  // Preserve the existing Enter submission and validation handlers.
  const submit = () => { if (!formBusy) { isLogin ? onLogin() : onRegister(); } };
  const onEnter = e => { if (e.key === "Enter") { e.preventDefault(); submit(); } };
  const switchTab = next => { setTab(next); setAuthError(""); };

  return (
    <main className={styles.root}>
      <div className={styles.layout}>
        <section className={styles.hero} aria-label="EVONCHAT 聊天社交平台">
          <div className={styles.heroContent}>
            <Brand />
            <h1 className={styles.headline}>與重要的人<span>保持聯繫</span></h1>
            <p className={styles.description}>
              聊天、分享生活，與朋友保持連結<br />讓每一次對話都更有溫度
            </p>
          </div>
        </section>

        <section className={styles.loginRegion} aria-labelledby="auth-title">
          <div className={styles.mobileBrand}><Brand /></div>
          <div className={styles.card} aria-busy={formBusy}>
            <h2 id="auth-title" className={styles.title}>{isLogin ? "歡迎回來 👋" : "建立你的帳戶 ✨"}</h2>
            <p className={styles.subtitle}>{isLogin ? "登入你的帳戶，繼續與朋友保持聯繫" : "填好基本資料，馬上開始聊天"}</p>

            {!isLogin && (
              <div className={styles.avatarPicker}>
                <span id="as-avatar-label" className={styles.label}>選擇頭像</span>
                <div role="group" aria-labelledby="as-avatar-label" className={styles.avatarOptions}>
                  {AVATAR_EMOJIS.map(e => (
                    <button key={e} type="button" disabled={formBusy} onClick={() => setAvatar(e)}
                      className={styles.avatarOption} style={{ backgroundColor: color }}
                      aria-label={`頭像 ${e}`} aria-pressed={avatar === e}>{e}</button>
                  ))}
                </div>
                <div role="group" aria-label="選擇頭像底色" className={styles.colorOptions}>
                  {COLORS.map(c => (
                    <button key={c} type="button" disabled={formBusy} onClick={() => setColor(c)}
                      className={styles.colorOption} style={{ backgroundColor: c }}
                      aria-label={`底色 ${c}`} aria-pressed={color === c} />
                  ))}
                </div>
              </div>
            )}

            <div className={styles.fields}>
              {!isLogin && (
                <div>
                  <label htmlFor="as-nickname" className={styles.label}>暱稱</label>
                  <input id="as-nickname" value={nickname} onChange={e => setNickname(e.target.value)}
                    onKeyDown={onEnter} placeholder="你的暱稱" className={styles.input} disabled={formBusy} />
                </div>
              )}
              <div>
                <label htmlFor="as-email" className={styles.label}>電子郵件</label>
                <input id="as-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={onEnter} autoComplete="email" placeholder="your@email.com"
                  className={styles.input} disabled={formBusy} />
              </div>
              <div>
                <label htmlFor="as-password" className={styles.label}>密碼</label>
                <div className={styles.passwordField}>
                  <input id="as-password" type={showPassword ? "text" : "password"}
                    value={password} onChange={e => setPassword(e.target.value)} onKeyDown={onEnter}
                    autoComplete={isLogin ? "current-password" : "new-password"} placeholder="••••••••"
                    className={styles.input} disabled={formBusy} />
                  <button type="button" className={styles.eye} disabled={formBusy}
                    onClick={() => setShowPassword(v => !v)} aria-controls="as-password"
                    aria-label={showPassword ? "隱藏密碼" : "顯示密碼"} aria-pressed={showPassword}>
                    {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
                  </button>
                </div>
              </div>
            </div>

            {authError && <div role="alert" className={styles.error}>{authError}</div>}
            <button type="button" className={styles.submit} onClick={submit} disabled={formBusy}>
              {busy && <span className={styles.spinner} aria-hidden="true" />}
              {busy ? "處理中..." : (isLogin ? "登入" : "建立帳號")}
            </button>
            <div className={styles.divider}><span>或</span></div>
            <button type="button" className={styles.google} onClick={onGoogleLogin} disabled={formBusy}>
              <GoogleMark /><span>使用 Google 繼續</span>
            </button>
            {isLogin && (
              <button type="button" className={styles.guest} onClick={onGuestLogin} disabled={formBusy}>
                {guestBusy && <span className={styles.spinner} aria-hidden="true" />}
                <span>{guestBusy ? "正在建立訪客工作區..." : "以訪客身分進入"}</span>
              </button>
            )}
            <div className={styles.swap}>
              {isLogin ? "還沒有帳戶？" : "已經有帳戶？"}
              <button type="button" disabled={formBusy} onClick={() => switchTab(isLogin ? "register" : "login")}>
                {isLogin ? "立即註冊" : "登入"}
              </button>
            </div>
            <footer className={styles.footer}>© 2026 EVONCHAT. All rights reserved.</footer>
          </div>
        </section>
      </div>
    </main>
  );
}
