import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import ChatRoom from '../components/ChatRoom';
import LoadingState from '../components/LoadingState';
import AuthScreen from '../components/AuthScreen';
import { auth, db, googleProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { saveAccount, consumePendingLoginEmail } from '../lib/accountSwitcher';

const AUTH_TIMEOUT_MS = 12000;

const AVATAR_EMOJIS = ["😊","👨‍💻","📚","🏃","🎮","🎨","🍜","🌸","🦊","🐼","🎧","⚡"];
const COLORS = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#ef4444","#06b6d4","#84cc16"];

function useSplashInteraction(onEnter) {
  const hintRef = useRef(null);
  const textColRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const go = (e) => {
      if (e.type === 'contextmenu') e.preventDefault();
      onEnter();
    };
    document.addEventListener('click', go);
    document.addEventListener('keydown', go);
    document.addEventListener('contextmenu', go);
    return () => {
      document.removeEventListener('click', go);
      document.removeEventListener('keydown', go);
      document.removeEventListener('contextmenu', go);
    };
  }, [onEnter]);

  useEffect(() => {
    const align = () => {
      if (!hintRef.current || !textColRef.current) return;
      const hintLeft = hintRef.current.getBoundingClientRect().left;
      const textLeft = textColRef.current.getBoundingClientRect().left;
      setOffset(hintLeft - textLeft);
      setVisible(true);
    };
    document.fonts.ready.then(align);
    window.addEventListener('resize', align);
    return () => window.removeEventListener('resize', align);
  }, []);

  return { hintRef, textColRef, offset, visible };
}

function SplashScreen({ onEnter }) {
  const [variant, setVariant] = useState('default');
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    setVariant(saved === 'neon' ? 'neon' : 'default');
  }, []);
  return variant === 'neon'
    ? <SplashScreenNeon onEnter={onEnter} />
    : <SplashScreenDefault onEnter={onEnter} />;
}

function SplashScreenDefault({ onEnter }) {
  const { hintRef, textColRef, offset, visible } = useSplashInteraction(onEnter);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        @keyframes pxblink { 0%,49%{opacity:1} 50%,100%{opacity:0.15} }
        @keyframes pxfloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pxfadein { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
        .splash-wrap {
          width: 100%;
          height: 100vh;
          position: relative;
          overflow: hidden;
          background: #0a0f1e;
          font-family: 'Press Start 2P', monospace;
          image-rendering: pixelated;
          animation: pxfadein 0.6s ease both;
        }
        .sp-glow-a { position:absolute; top:-22%; left:10%; width:43%; aspect-ratio:1; border-radius:50%;
          background:radial-gradient(circle,rgba(99,102,241,0.28),transparent 70%); }
        .sp-glow-b { position:absolute; bottom:-29%; right:-6%; width:43%; aspect-ratio:1; border-radius:50%;
          background:radial-gradient(circle,rgba(34,211,238,0.16),transparent 70%); }
        .sp-frame { position:absolute; inset:20px; border:6px solid #6366f1;
          box-shadow:0 0 0 6px #0a0f1e, 0 0 0 12px #312e81; pointer-events:none; }
        .sp-scanlines { position:absolute; inset:0; pointer-events:none;
          background:repeating-linear-gradient(0deg,rgba(0,0,0,0.22) 0,rgba(0,0,0,0.22) 2px,transparent 2px,transparent 4px); }
        .sp-content { position:absolute; inset:20px; display:flex; align-items:center; justify-content:center; }
        .sp-inner { display:flex; align-items:center; gap:5%; }
        .sp-bubble { flex:0 0 auto; animation:pxfloat 4s ease-in-out infinite; }
        .sp-bubble svg { filter:drop-shadow(0 0 14px rgba(99,102,241,0.8)); width:min(208px,18vw); height:auto; }
        .sp-text { display:flex; flex-direction:column; gap:3.8%; }
        .sp-tag { display:inline-flex; align-items:center; gap:1.9%; align-self:flex-start; margin-bottom:2%; }
        .sp-arrow { font-size:clamp(9px,1.17vw,14px); color:#22d3ee; animation:pxblink 1.5s steps(1) infinite; }
        .sp-label { font-size:clamp(9px,1.17vw,14px); color:#a5b4fc; letter-spacing:0.28em; }
        .sp-title { display:flex; flex-direction:column; gap:2.2%; margin-bottom:3%; }
        .sp-h1 { font-size:clamp(28px,5.67vw,68px); line-height:1; letter-spacing:0.03em; }
        .sp-l1 { color:#ffffff; text-shadow:0 0 18px rgba(139,92,246,0.9),5px 5px 0 #4c1d95; }
        .sp-l2 { color:#8b5cf6; text-shadow:0 0 18px rgba(34,211,238,0.5),5px 5px 0 #1e293b; }
        .sp-sub { font-family:'Cubic11','Noto Sans TC',sans-serif; font-weight:400;
          font-size:clamp(14px,2.33vw,28px); color:#94a3b8; letter-spacing:0.14em; }
        .sp-hint { position:absolute; bottom:8.25%; left:50%; transform:translateX(-50%);
          font-size:clamp(7px,0.83vw,10px); color:#8b5cf6; letter-spacing:0.4em;
          text-shadow:0 0 10px rgba(139,92,246,0.85),0 0 2px rgba(167,139,250,0.9);
          animation:pxblink 1.5s steps(1) infinite; white-space:nowrap; }
      `}</style>
      <div className="splash-wrap">
        <div className="sp-glow-a" />
        <div className="sp-glow-b" />
        <div className="sp-frame" />
        <div className="sp-scanlines" />
        <div className="sp-content">
          <div className="sp-inner" style={{ transform: `translateX(${offset}px)`, visibility: visible ? 'visible' : 'hidden' }}>
            <div className="sp-bubble">
              <svg viewBox="0 0 18 16" shape-rendering="crispEdges">
                <rect x="1" y="0" width="16" height="1" fill="#22d3ee"/>
                <rect x="0" y="1" width="1" height="10" fill="#22d3ee"/>
                <rect x="17" y="1" width="1" height="10" fill="#22d3ee"/>
                <rect x="1" y="1" width="16" height="7" fill="#8b5cf6"/>
                <rect x="1" y="8" width="16" height="3" fill="#6366f1"/>
                <rect x="2" y="11" width="14" height="1" fill="#22d3ee"/>
                <rect x="3" y="11" width="4" height="2" fill="#6366f1"/>
                <rect x="3" y="13" width="2" height="1" fill="#6366f1"/>
                <rect x="2" y="11" width="1" height="3" fill="#22d3ee"/>
                <rect x="5" y="13" width="1" height="1" fill="#22d3ee"/>
                <rect x="3" y="14" width="2" height="1" fill="#22d3ee"/>
                <rect x="4" y="5" width="2" height="2" fill="#0a0f1e"/>
                <rect x="8" y="5" width="2" height="2" fill="#0a0f1e"/>
                <rect x="12" y="5" width="2" height="2" fill="#0a0f1e"/>
              </svg>
            </div>
            <div className="sp-text" ref={textColRef}>
              <div className="sp-tag">
                <span className="sp-arrow">▶</span>
                <span className="sp-label">PRESS START</span>
              </div>
              <div className="sp-title">
                <h1 className="sp-h1 sp-l1">EVON</h1>
                <h1 className="sp-h1 sp-l2">CHAT</h1>
              </div>
              <span className="sp-sub">即時聊天・好友・群組・直播</span>
            </div>
          </div>
        </div>
        <div className="sp-hint" ref={hintRef}>CLICK OR PRESS ANY KEY TO CONTINUE</div>
      </div>
    </div>
  );
}

function SplashScreenNeon({ onEnter }) {
  const { hintRef, textColRef, offset, visible } = useSplashInteraction(onEnter);

  return (
    <div style={{ minHeight: '100vh', background: '#05060c', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        @keyframes pxblink { 0%,49%{opacity:1} 50%,100%{opacity:0.15} }
        @keyframes pxfloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pxfadein { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
        @keyframes dotpulse { 0%,60%,100%{opacity:0.35; transform:scale(0.85)} 30%{opacity:1; transform:scale(1)} }
        @keyframes sparkle { 0%,100%{opacity:0.3; transform:scale(0.8) rotate(0deg)} 50%{opacity:1; transform:scale(1.1) rotate(20deg)} }
        .splash-wrap {
          width: 100%;
          height: 100vh;
          position: relative;
          overflow: hidden;
          background: #05060c;
          font-family: 'Press Start 2P', monospace;
          animation: pxfadein 0.6s ease both;
        }
        .sp-bokeh { position:absolute; inset:0; pointer-events:none;
          background:
            radial-gradient(circle at 8% 15%, rgba(99,102,241,0.35), transparent 32%),
            radial-gradient(circle at 92% 20%, rgba(236,72,153,0.30), transparent 30%),
            radial-gradient(circle at 15% 88%, rgba(34,211,238,0.22), transparent 30%),
            radial-gradient(circle at 88% 85%, rgba(168,85,247,0.28), transparent 32%);
          filter: blur(40px);
        }
        .sp-circuit { position:absolute; inset:0; pointer-events:none; opacity:0.5;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cg fill='none' stroke='%2322d3ee' stroke-width='1' opacity='0.35'%3E%3Cpath d='M10 20 H70 V60 H130'/%3E%3Cpath d='M20 130 V90 H60 V60'/%3E%3Cpath d='M100 10 V45 H130'/%3E%3Ccircle cx='70' cy='60' r='2.4' fill='%2322d3ee'/%3E%3Ccircle cx='60' cy='60' r='2.4' fill='%23ec4899'/%3E%3Ccircle cx='100' cy='45' r='2.4' fill='%2322d3ee'/%3E%3C/g%3E%3C/svg%3E");
          background-size: 140px 140px;
        }
        .sp-frame { position:absolute; inset:24px; border-radius:28px; padding:5px;
          background:linear-gradient(135deg,#22d3ee,#a855f7 55%,#ec4899);
          -webkit-mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite:xor; mask-composite:exclude;
          box-shadow:0 0 24px rgba(34,211,238,0.35), 0 0 40px rgba(236,72,153,0.25);
          pointer-events:none; }
        .sp-content { position:absolute; inset:24px; display:flex; align-items:center; justify-content:center; }
        .sp-inner { display:flex; align-items:center; gap:5%; }
        .sp-bubble { flex:0 0 auto; animation:pxfloat 4s ease-in-out infinite;
          width:min(150px,14vw); aspect-ratio:1.15; border-radius:26px; position:relative;
          background:rgba(10,14,28,0.6);
          border:2px solid transparent;
          background-image:linear-gradient(rgba(10,14,28,0.75),rgba(10,14,28,0.75)), linear-gradient(135deg,#22d3ee,#a855f7,#ec4899);
          background-origin:border-box; background-clip:padding-box, border-box;
          box-shadow:0 0 20px rgba(34,211,238,0.3), 0 0 30px rgba(236,72,153,0.2);
          display:flex; align-items:center; justify-content:center; gap:8px; }
        .sp-bubble::after { content:''; position:absolute; left:22%; bottom:-10px; width:16px; height:16px;
          background:rgba(10,14,28,0.75); border-right:2px solid #a855f7; border-bottom:2px solid #a855f7;
          transform:rotate(45deg); border-radius:0 0 4px 0; }
        .sp-dot { width:11px; height:11px; border-radius:50%; background:#22ff88;
          box-shadow:0 0 8px #22ff88, 0 0 14px rgba(34,255,136,0.6);
          animation:dotpulse 1.4s ease-in-out infinite; }
        .sp-dot:nth-child(2) { animation-delay:0.2s; }
        .sp-dot:nth-child(3) { animation-delay:0.4s; }
        .sp-text { display:flex; flex-direction:column; gap:3.8%; }
        .sp-tag { display:inline-flex; align-items:center; gap:1.9%; align-self:flex-start; margin-bottom:2%; }
        .sp-arrow { font-size:clamp(9px,1.17vw,14px); color:#22d3ee; animation:pxblink 1.5s steps(1) infinite; }
        .sp-label { font-size:clamp(9px,1.17vw,14px); color:#67e8f9; letter-spacing:0.28em; }
        .sp-title { display:flex; flex-direction:column; gap:2.2%; margin-bottom:3%; }
        .sp-h1 { font-size:clamp(28px,5.67vw,68px); line-height:1; letter-spacing:0.03em; }
        .sp-l1 { color:#67e8f9; text-shadow:0 0 10px #22d3ee, 0 0 24px rgba(34,211,238,0.8); }
        .sp-l2 { color:#f0abfc; text-shadow:0 0 10px #d946ef, 0 0 24px rgba(217,70,239,0.8); }
        .sp-sub { font-family:'Cubic11','Noto Sans TC',sans-serif; font-weight:400;
          font-size:clamp(14px,2.33vw,28px); color:#cbd5e1; letter-spacing:0.14em; }
        .sp-hint { position:absolute; bottom:8.25%; left:50%; transform:translateX(-50%);
          font-size:clamp(7px,0.83vw,10px); color:#e2e8f0; letter-spacing:0.4em;
          text-shadow:0 0 10px rgba(255,255,255,0.7);
          animation:pxblink 1.5s steps(1) infinite; white-space:nowrap; }
        .sp-sparkle { position:absolute; bottom:6%; right:5%; font-size:22px; color:#fff;
          animation:sparkle 2.4s ease-in-out infinite; text-shadow:0 0 12px rgba(255,255,255,0.8); }
      `}</style>
      <div className="splash-wrap">
        <div className="sp-bokeh" />
        <div className="sp-circuit" />
        <div className="sp-frame" />
        <div className="sp-content">
          <div className="sp-inner" style={{ transform: `translateX(${offset}px)`, visibility: visible ? 'visible' : 'hidden' }}>
            <div className="sp-bubble">
              <span className="sp-dot" />
              <span className="sp-dot" />
              <span className="sp-dot" />
            </div>
            <div className="sp-text" ref={textColRef}>
              <div className="sp-tag">
                <span className="sp-arrow">▶</span>
                <span className="sp-label">PRESS START</span>
              </div>
              <div className="sp-title">
                <h1 className="sp-h1 sp-l1">EVON</h1>
                <h1 className="sp-h1 sp-l2">CHAT</h1>
              </div>
              <span className="sp-sub">即時聊天・好友・群組・直播</span>
            </div>
          </div>
        </div>
        <div className="sp-hint" ref={hintRef}>CLICK OR PRESS ANY KEY TO CONTINUE</div>
        <span className="sp-sparkle">✦</span>
      </div>
    </div>
  );
}

function getErrorMessage(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return '帳號或密碼錯誤';
    case 'auth/email-already-in-use': return '此電子郵件已被使用';
    case 'auth/invalid-email': return '電子郵件格式不正確';
    case 'auth/weak-password': return '密碼至少需要6位';
    default: return '發生錯誤，請稍後再試';
  }
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('loading'); // loading | login | setup | chat | error
  const [authErrorMsg, setAuthErrorMsg] = useState('');

  // Login / Register form state
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState(() => consumePendingLoginEmail());
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('😊');
  const [color, setColor] = useState('var(--accent)');
  const [authError, setAuthError] = useState('');
  const [busy, setBusy] = useState(false);

  // First-time setup state (for Google users)
  const [setupNickname, setSetupNickname] = useState('');
  const [setupAvatar, setSetupAvatar] = useState('😊');
  const [setupColor, setSetupColor] = useState('var(--accent)');

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) { setUser(null); setStep('login'); return; }
      setUser(u);
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) {
          const p = snap.data();
          saveAccount({ uid: u.uid, email: u.email, nickname: p.nickname, avatar: p.avatar, avatarImage: p.avatarImage, color: p.color });
          // The splash screen is a once-per-session boot animation, not a
          // per-navigation one — every client-side nav back to "/" (the
          // 返回聊天室 link on /profile or /feed, browser back, etc.) remounts
          // this component fresh, so without this check it would replay the
          // "PRESS START" screen every single time. sessionStorage survives
          // across that remount (unlike React state) but resets on an actual
          // new tab/browser session, which is the boot-once behavior we want.
          let splashShown = false;
          try { splashShown = sessionStorage.getItem('evonchat-splash-shown') === '1'; } catch {}
          setStep((splashShown || router.query.view) ? 'chat' : 'splash');
        } else {
          setSetupNickname(u.displayName || '');
          setStep('setup');
        }
      } catch (e) {
        console.error('[Home] failed to load user profile', e);
        setAuthErrorMsg('無法連線到伺服器，請檢查網路連線後再試一次');
        setStep('error');
      }
    }, (e) => {
      console.error('[Home] auth state listener failed', e);
      setAuthErrorMsg('登入狀態驗證失敗，請重新整理頁面');
      setStep('error');
    });
    return unsub;
  }, []);

  // Safety net: if Firebase never calls back at all (blocked request, dead
  // network, stuck offline-persistence handshake) don't leave the user
  // staring at a spinner forever — surface a retry after a timeout.
  useEffect(() => {
    if (step !== 'loading') return;
    const t = setTimeout(() => {
      setAuthErrorMsg('載入時間過長，可能是網路連線問題');
      setStep('error');
    }, AUTH_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [step]);

  const handleLogin = async () => {
    setAuthError('');
    if (!email.trim() || !password) return setAuthError('請填寫所有欄位');
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) { setAuthError(getErrorMessage(e.code)); }
    finally { setBusy(false); }
  };

  const handleRegister = async () => {
    setAuthError('');
    if (!email.trim() || !password || !nickname.trim()) return setAuthError('請填寫所有欄位');
    if (password.length < 6) return setAuthError('密碼至少需要6位');
    setBusy(true);
    try {
      const { user: u } = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await setDoc(doc(db, 'users', u.uid), {
        nickname: nickname.trim(), avatar, color,
        bio: '', status: 'online', statusText: '',
        email: email.trim(), friends: [], pendingIn: [], pendingOut: [],
        avatarImage: '/avatar1.png',
        createdAt: serverTimestamp(),
      });
      setStep('chat');
    } catch (e) { setAuthError(getErrorMessage(e.code)); }
    finally { setBusy(false); }
  };

  const handleGoogleLogin = async () => {
    setAuthError('');
    try { await signInWithPopup(auth, googleProvider); }
    catch { setAuthError('Google 登入失敗，請稍後再試'); }
  };

  const handleSetup = async () => {
    if (!setupNickname.trim() || !user) return;
    setBusy(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        nickname: setupNickname.trim(), avatar: setupAvatar, color: setupColor,
        bio: '', status: 'online', statusText: '',
        email: user.email || '', friends: [], pendingIn: [], pendingOut: [],
        avatarImage: '/avatar1.png',
        createdAt: serverTimestamp(),
      });
      setStep('chat');
    } catch (e) { console.error(e); }
    finally { setBusy(false); }
  };

  const inputStyle = {
    width: '100%', background: 'var(--panel-alt)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--text)',
    fontSize: 16, outline: 'none', boxSizing: 'border-box',
  };

  // ── Loading ──
  if (step === 'loading') {
    return <LoadingState label="載入中..." />;
  }

  // ── Error (auth check failed, or timed out) ──
  if (step === 'error') {
    return (
      <LoadingState
        error={authErrorMsg || '發生錯誤，請稍後再試'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // ── Splash ──
  if (step === 'splash') {
    return <SplashScreen onEnter={() => {
      try { sessionStorage.setItem('evonchat-splash-shown', '1'); } catch {}
      setStep('chat');
    }} />;
  }

  // ── Chat ──
  if (step === 'chat') return <ChatRoom user={user} />;

  // ── First-time profile setup (Google users) ──
  if (step === 'setup') {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div aria-hidden="true" style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
            <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, margin: 0 }}>建立你的個人資料</h1>
            <p style={{ color: 'var(--text-faint)', fontSize: 14, marginTop: 6 }}>讓大家認識你</p>
          </div>
          <div style={{ background: 'var(--panel)', borderRadius: 'var(--radius-lg)', padding: 28, border: '1px solid var(--border)', backdropFilter: 'var(--panel-blur)', WebkitBackdropFilter: 'var(--panel-blur)' }}>
            <div style={{ marginBottom: 18 }}>
              <span id="setup-avatar-label" style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 6, display: 'block' }}>選擇頭像</span>
              <div role="group" aria-labelledby="setup-avatar-label" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {AVATAR_EMOJIS.map(e => (
                  <button key={e} type="button" onClick={() => setSetupAvatar(e)} aria-label={`頭像 ${e}`} aria-pressed={setupAvatar === e} style={{ width: 38, height: 38, borderRadius: '50%', border: setupAvatar === e ? '2px solid var(--accent)' : '2px solid transparent', background: setupColor, cursor: 'pointer', fontSize: 18 }}>{e}</button>
                ))}
              </div>
              <div role="group" aria-label="選擇頭像底色" style={{ display: 'flex', gap: 6 }}>
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setSetupColor(c)} aria-label={`底色 ${c}`} aria-pressed={setupColor === c} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: setupColor === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="setup-nickname" style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4, display: 'block' }}>暱稱</label>
              <input id="setup-nickname" value={setupNickname} onChange={e => setSetupNickname(e.target.value)}
                placeholder="你的暱稱" onKeyDown={e => e.key === 'Enter' && handleSetup()}
                style={inputStyle} />
            </div>
            <button onClick={handleSetup} disabled={busy || !setupNickname.trim()} style={{
              width: '100%', background: 'linear-gradient(135deg,var(--accent),var(--accent-2))',
              border: 'none', borderRadius: 'var(--radius-md)', padding: '12px', color: '#fff',
              fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: (busy || !setupNickname.trim()) ? 0.6 : 1,
            }}>
              {busy ? '儲存中...' : '進入聊天室'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Login / Register ──
  // UI 全部移到 components/AuthScreen.js（純畫面），這裡只負責把既有的 state
  // 與 handler 傳下去——authentication 流程、Firebase 呼叫、登入後的 setStep
  // 都沒有變動。
  return (
    <AuthScreen
      tab={tab} setTab={setTab}
      email={email} setEmail={setEmail}
      password={password} setPassword={setPassword}
      nickname={nickname} setNickname={setNickname}
      avatar={avatar} setAvatar={setAvatar}
      color={color} setColor={setColor}
      authError={authError} setAuthError={setAuthError}
      busy={busy}
      onLogin={handleLogin}
      onRegister={handleRegister}
      onGoogleLogin={handleGoogleLogin}
    />
  );
}
