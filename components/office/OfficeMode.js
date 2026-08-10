import dynamic from "next/dynamic";
import LoadingState from "../LoadingState";
// Pixi 官方的 CSP-safe 執行時（原本是為了 Electron 嚴格的 unsafe-eval 限制
// 準備的，一般網站不見得需要，但留著也不影響、更安全，直接沿用原專案的
// 做法）。這個 side-effect import 一定要在任何 pixi.js 場景程式碼執行之前
// 跑過一次；OfficeMode 這個檔案在 ChatRoom.js 那邊本來就是整包用
// dynamic(ssr:false) 載入，不會在伺服器端被評估到，這裡才能放心在最上面
// import。
import "pixi.js/unsafe-eval";

// AI Office 是另一個獨立專案（Vite + Electron + pixi.js/spine 動畫引擎）搬
// 過來的——這裡只是 Phase 1：把純視覺的辦公室場景（components/office/src/
// 底下那份，跟原本 Electron 的 IPC／本機儲存完全無關的部分）接進 EvonChat，
// 資料夾 rail 那顆「AI OFFICE」鈕點下去看到的就是這個。任務列表／對話／
// 行事曆／DeepSeek 真的執行任務那些後續階段還沒接，先讓場景本身能動起來。
//
// pixi.js 需要真的 <canvas>／WebGL，SSR 階段沒有 window，所以整包用
// ssr:false 的 dynamic import，只在瀏覽器端才載入。
const SpineOfficeCanvas = dynamic(
  () => import("./src/components/SpineOfficeCanvas").then(m => m.SpineOfficeCanvas),
  { ssr: false, loading: () => <LoadingState label="載入 AI Office..." minHeight="100%" /> }
);

export default function OfficeMode({ onClose }) {
  return (
    <div style={{ position: "relative", flex: "1 1 auto", minHeight: 0, height: "100%", width: "100%", background: "#fff", overflow: "hidden" }}>
      {/* SpineOfficeCanvas.tsx 內部就是一個寫死 className="spine-office-canvas"
          的 <div>，原本的樣式在 ai-office 自己那份 62KB 的 styles.css 裡
          （.spine-office-canvas { position:absolute; inset:0; ... }）——這裡
          沒有整包引入那份全域樣式表（怕跟 EvonChat 自己的樣式打架），所以
          這顆 class 要有的定位/尺寸規則得自己補一份，不然這個 <div> 沒有
          寬高，ResizeObserver 量到 0×0 就永遠不會真的呼叫 scene.init()——
          畫面會卡在完全空白（不是「載入中」，是初始化真的沒被觸發）。 */}
      <style jsx>{`
        div :global(.spine-office-canvas) {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background: #fff;
        }
        div :global(.spine-office-canvas canvas) {
          display: block;
          width: 100%;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
        }
      `}</style>
      <SpineOfficeCanvas tasks={[]} paused={false} onAgentSelect={() => {}} />
      {onClose && (
        <button onClick={onClose} aria-label="離開 AI Office"
          style={{
            position: "absolute", top: 16, right: 16, zIndex: 20,
            width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(0,0,0,0.1)",
            background: "rgba(255,255,255,0.92)", color: "#333", fontSize: 18, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          }}>
          ✕
        </button>
      )}
    </div>
  );
}
