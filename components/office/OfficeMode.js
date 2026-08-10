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

export default function OfficeMode() {
  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0, width: "100%", background: "#fff", overflow: "hidden" }}>
      <SpineOfficeCanvas tasks={[]} paused={false} onAgentSelect={() => {}} />
    </div>
  );
}
