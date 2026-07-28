# EVONCHAT 圖片編輯功能改善報告

**文件性質：** 工程改善計畫（Remediation & Delivery Plan）
**依據文件：** `EVONCHAT_IMAGE_EDITOR_AUDIT_2026-07-28.md`（產品審核報告）
**撰寫日期：** 2026-07-28
**適用對象：** 負責 `components/media-editor/*` 及 `components/ImageEditorRoom.js` 的工程團隊
**範圍聲明：** 本報告不重複審核報告的競品研究內容，只將其結論轉化為可執行的技術方案、工作量估算、驗收標準與時程安排。所有問題均附上目前程式碼的實際檔案／行號依據。

---

## 1. 文件目的

審核報告已經回答「問題是什麼、為什麼重要、業界怎麼做」。本報告要回答的是「**要怎麼修、誰來修、修到什麼程度算完成、要花多久**」。

寫作原則：

- 每個問題附**根本原因**（已核對目前程式碼，非僅引用審核報告）、**解決方案設計**、**驗收標準**、**工作量估算**。
- 工作量以「人日」為單位，假設由 1 名熟悉本專案 Fabric.js 架構的前端工程師執行，未含設計／QA 資源。
- 優先順序沿用審核報告的 P0／P1／P2 分級，但補上可執行的技術路徑。
- 凡審核報告已有具體建議者（如匯出面板欄位、桌面版面草圖），不重複繪製，直接引用其章節。

---

## 2. 現況覆核

在撰寫本報告前，重新核對了審核報告引用的關鍵程式碼位置，確認問題在目前版本（含近期「去除留白」「文字面板」「左側工具列」等改動之後）**依然存在**，僅行號略有偏移：

| 審核報告問題 | 目前程式碼位置 | 覆核結果 |
|---|---|---|
| P0-1 重新編輯不還原 | `ImageEditorRoom.js:127-135`（`onExport` 只存 blob）、`:169`（「重新編輯」按鈕只 `setEditingPhoto(true)`，`originalFile` 仍是編輯前的原始檔案） | **確認存在** |
| P0-2 undo/redo 後底圖引用失效 | `usePhotoEditorCore.js:325-337`（`restoreHistory` 內 `canvas.loadFromJSON` 後，只對「新畫布的第一個物件」設定 `selectable:false`，從未把 `imageObjRef.current` 指向這個新物件） | **確認存在，且風險範圍已擴大**：`trimToContent`（新功能）、`applyCrop`、`commitAdjustments`、隱私馬賽克等現在全部依賴 `imageObjRef.current` |
| P1-1 對齊輔助是假功能 | `PhotoEditorEmbedded.js:116-125`（按鈕程式碼註解已自陳「actual guide-line/snap-correction behavior isn't built yet」） | **確認存在** |
| P1-3 匯入未驗證 | `mediaValidation.js` 定義了 `validatePhotoFile`，但 `ImageEditorRoom.js` 的 `attachFile`/`onFileChosen` 與 `PhotoEditorEmbedded.js:92-93` 的 `<input onChange>` 均未呼叫 | **確認存在** |
| P1-4 輸出固定格式 | `usePhotoEditorCore.js:10`（`MAX_EDIT_DIMENSION=1440`）、`:676`（`canvas.toBlob({format:"jpeg", quality:0.92})`） | **確認存在** |
| P1-5 草稿流程未接上 | `editorDb.js` 有完整 CRUD；`ImageEditorRoom.js:127` 呼叫 `PhotoEditorEmbeddedLazy` 時未傳 `draftId` prop | **確認存在** |

結論：審核報告的技術判斷**可直接作為本改善計畫的依據**，不需要重新調查。

---

## 3. 問題與解決方案總表

### P0（作品安全／功能誠信 — 必須優先）

| # | 問題 | 根本原因 | 解決方案 | 工作量 |
|---|---|---|---|---|
| P0-1 | 重新編輯遺失作品 | `onExport` 只回傳最終 `blob`，沒有保留可再編輯的畫布狀態；「重新編輯」重新掛載編輯器時傳的是 `originalFile` | 見 §4.1：儲存 Fabric JSON + 底圖資源，重新編輯時還原 JSON 而非重新 import 原圖 | 2.5 人日 |
| P0-2 | undo/redo 後底圖引用失效 | `restoreHistory` 重建畫布物件後未同步更新 `imageObjRef` | 見 §4.2：改用穩定的 `data` 標記辨識底圖，而非「假設第一個物件」或殘留 ref | 1 人日 |
| P0-3 | 離開無未儲存保護 | 沒有 dirty flag；`onCancel`／桌面自動重開 effect 直接捨棄狀態 | 見 §4.3：加入 dirty state + 離開確認 + 本地自動草稿 | 1.5 人日 |

**P0 小計：5 人日**

### P1（上線前必須修正）

| # | 問題 | 根本原因 | 解決方案 | 工作量 |
|---|---|---|---|---|
| P1-1 | 對齊輔助是假功能 | 只有按鈕 state，無吸附邏輯 | 短期：移除按鈕或加「開發中」提示（0.25 人日）／中期：實作畫布中心＋物件邊緣吸附（見 §4.4，2 人日） | 0.25–2 人日 |
| P1-2 | 濾鏡歷史行為不一致 | 濾鏡透過 effect 直接套用，未走 `pushHistory` 合併節點 | 濾鏡選擇時比照 slider 的「拖動預覽、放手提交」模式，改為離開濾鏡工具或選定新濾鏡時才 `pushHistory()` 一次 | 0.5 人日 |
| P1-3 | 匯入未驗證 | 現有 `mediaValidation.js` 未被呼叫 | 在 `attachFile`（ImageEditorRoom）與 `importPhoto` 的 `<input onChange>`（PhotoEditorEmbedded）呼叫 `validatePhotoFile`，失敗時 `toast` 提示並中止 | 0.5 人日 |
| P1-4 | 輸出固定 JPEG/1440px | 硬編碼常數，無 UI | 見 §4.5：匯出面板（格式／尺寸／品質／檔名） | 3 人日 |
| P1-5 | 草稿流程未接上 | `draftId` 未傳入 standalone 編輯室 | 見 §4.6：接上定時自動儲存＋最近草稿入口 | 1.5 人日 |
| P1-6 | 「開啟圖片」語意不一致 | 已有底圖時仍是「加入」而非「取代」 | 二次匯入時彈出選擇（取代底圖／加入為新物件），文案分離 | 0.5 人日 |

**P1 小計：約 6.75–8.5 人日**（視對齊輔助是否做完整吸附）

### P2（產品競爭力，暫緩但需排入路線圖）

沿用審核報告 §6 P2 清單，不重複列出；已整理進 §5 Phase 1／Phase 2 路線圖並附開發量級估算（見 §5.2 表）。

---

## 4. P0／關鍵 P1 技術方案細節

### 4.1 P0-1：重新編輯還原完整作品

**設計方向：** 編輯器完成時，除了輸出的 `blob`，額外保存 `canvas.toJSON(["data"])`（含自訂 `data` 標記，見 §4.2）與畫布尺寸。`ImageEditorRoom` 的 `result` state 增加 `sceneJSON` 欄位。「重新編輯」時，若 `sceneJSON` 存在，`PhotoEditorEmbedded` 走「還原」路徑而非「import 新檔案」路徑。

**具體改動：**

1. `usePhotoEditorCore.js`：`handleExport` 除了產生 blob，額外回傳 `canvas.toJSON(["data"])`；`onExport` callback 簽章由 `(blob)` 改為 `(blob, sceneJSON)`。
2. `ImageEditorRoom.js`：`result` 增加 `sceneJSON`；`onExport={(blob, sceneJSON) => setResult({ url, blob, sceneJSON })}`；`PhotoEditorEmbeddedLazy` 增加 `initialScene={result?.sceneJSON}` prop（只在「重新編輯」時傳入，「編輯新圖片」時不傳）。
3. `usePhotoEditorCore.js` 的 `init()`：若 `initialScene` 存在，改為 `canvas.loadFromJSON(initialScene)` 而非 `FabricImage.fromURL(file)`；並依 §4.2 的方式重新指認 `imageObjRef`。

**驗收標準：**

- 完成編輯 → 點「重新編輯」→ 畫布 100% 還原剛才的最終狀態（含文字、貼圖、旋轉、裁剪、濾鏡）。
- 「編輯新圖片」仍正確清空並回到空白／原圖狀態，不受此改動影響。

### 4.2 P0-2：底圖引用穩定化

**根本問題：** `imageObjRef.current` 是一個「物件實例」的參照，一旦畫布透過 `loadFromJSON` 重建（無論是 undo/redo 或 P0-1 的還原流程），舊實例已從畫布上消失，但 ref 仍指向它，導致後續操作（裁剪／濾鏡／調整／馬賽克／去除留白）作用在「不在畫布上」的殭屍物件。

**解決方案：** 不依賴 ref 記憶實例，改為在物件本身標記角色，每次需要「底圖」時用 `canvas.getObjects().find(o => o.data?.role === "base")` 現查現用：

1. 底圖建立時（`importPhoto` 的 `becomesBase` 分支）設定 `img.set({ data: { role: "base" } })`。
2. 新增一個 helper：`getBaseImage(canvas) { return canvas.getObjects().find(o => o.data?.role === "base") || null; }`。
3. `restoreHistory`、`applyCrop`、`commitAdjustments`、`trimToContent`、隱私馬賽克等所有目前讀取 `imageObjRef.current` 的地方，改用 `getBaseImage(fabricCanvasRef.current)`。
4. `fabric.Object.prototype.toObject` 預設不含自訂 `data` 欄位，需在 `canvas.toJSON()`／`loadFromJSON` 呼叫時明確帶上 `["data"]` 屬性清單（fabric v6 支援），確保 `role` 標記能在序列化／還原後留存。
5. 移除 `imageObjRef` 這個可變引用本身（或保留但只作 `hasImage` 判斷的 cache，不再作為操作依據），避免未來再度出現「引用與畫布狀態不同步」的同類錯誤。

**驗收標準：**

- 匯入圖片 → 加文字 → undo 兩步 → 對照片套用濾鏡／調整／去除留白 → 效果正確反映在畫布上（目前版本會作用在殭屍物件、畫面無變化或報錯）。
- redo 回到最新狀態後，同樣操作依然正確。

### 4.3 P0-3：離開保護與自動草稿

1. 在 `usePhotoEditorCore` 增加 `isDirty` state：任何 `pushHistory()` 呼叫（除了初始化那一次）都設為 `true`；`handleExport` 成功後重設為 `false`。
2. `PhotoEditorEmbedded.js` 的「返回」（`onCancel`）改為：`isDirty` 為 `true` 時彈出確認（沿用現有 `toast`/`confirm` 慣例，或簡單 `window.confirm`，視覺一致性視現有 UI 元件庫決定）。
3. `ImageEditorRoom.js:35-38` 的桌面自動重開 effect：加上「有未儲存變更時不自動重開」的判斷，避免使用者還沒確認就被清空。
4. 自動草稿：沿用 §4.6 的 `editorDb.js` 定時儲存機制，等同於「崩潰恢復」的基礎——不需要另外開發儲存邏輯，只需要接上（見 §4.6）。

**驗收標準：**

- 有未儲存修改時點返回／關閉分頁前，會被詢問是否放棄變更。
- 重新整理瀏覽器後，若草稿存在，能在編輯室看到「繼續上次草稿」入口並正確還原。

### 4.4 P1-1：對齊輔助（中期方案，可分兩步驗收）

**第一步（P1 必做，0.25 人日）：** 若短期內無法排入吸附邏輯的開發資源，按鈕文案改為「對齊輔助（開發中）」或直接移除，避免功能名實不符——這是審核報告點名的「誠信」問題，成本最低、風險最高，應優先處理。

**第二步（可排入 Phase 1，2 人日）：** 實作基礎吸附：

1. 監聽 `object:moving` 事件，取得移動中物件的邊界（`getBoundingRect()`）。
2. 與畫布中心線（水平／垂直）、畫布邊緣、其餘物件的中心／邊緣做誤差比較（閾值如 ±6px，需依畫布縮放比例調整）。
3. 命中時：(a) 用 `left`/`top` 強制對齊到目標值；(b) 繪製暫時的參考線（可用一個獨立、不可互動的 `fabric.Line`，`selection:cleared`／`object:modified` 時移除）。
4. `snapEnabled` 為 `false` 時完全跳過上述邏輯（現有 UI 開關保留不變）。

不需要做到 Photoshop／Affinity 等級的多重參考線系統，畫布中心＋物件邊緣兩類已能滿足社交圖片排版的九成情境。

### 4.5 P1-4：匯出面板

沿用審核報告 §5.3、§9 的欄位建議（格式 JPEG/PNG/WebP、尺寸／原尺寸/自訂長邊、品質、透明背景、檔名），技術落地：

1. 新增 `ExportPanel.js`（embedded-only，比照 `TextPanel.js` 的模式，不影響 `PhotoEditor.js` 全螢幕版）。
2. `usePhotoEditorCore.js` 的 `handleExport` 簽章擴充為 `handleExport(options)`，`options = { format, quality, maxDimension, filename }`；PNG 格式時 `canvas.toBlob({format:"png"})` 忽略 quality，且需確認 `canvas.backgroundColor` 為透明（`""`）才能真正保留透明背景。
3. 「完成」按鈕改為開啟 `ExportPanel`（預覽＋參數），面板內的「匯出」才真正呼叫 `handleExport`；MVP 版可先提供「快速匯出」（沿用目前預設值一鍵完成）與「更多選項」兩個入口，避免對現有單鍵完成的使用者造成操作步驟暴增的觀感。
4. `MAX_EDIT_DIMENSION=1440` 的縮放邏輯，需明確告知使用者（例如面板內顯示「原圖 3024×4032 → 將輸出為 1440×1920，如需原尺寸請選擇『原尺寸』」），而非目前的靜默縮放。

**驗收標準：**

- 可匯出 PNG 且保留透明背景。
- 高解析度原圖選擇「原尺寸」時，輸出實際尺寸等於原圖（不再被 1440px 靜默限制）。
- 品質滑桿即時顯示預估檔案大小（可用 `blob.size` 於選擇後才知道即可，不要求即時運算預覽）。

### 4.6 P1-5：草稿流程接上

1. `ImageEditorRoom.js` 進入編輯時產生／取用一組 `draftId`（可用 `crypto.randomUUID()`，掛在 component state，隨 `originalFile`／`startBlank` 一併建立）。
2. 傳入 `PhotoEditorEmbeddedLazy` 的 `draftId` prop（目前完全未傳，見覆核表）。
3. `usePhotoEditorCore.js` 內既有的「`draftId` 存在時於完成時 save」邏輯保留，額外加：每次 `pushHistory()` 之後 debounce（如 3 秒）呼叫 `saveDraft`，達成真正的自動草稿，而不只是完成時才存一次。
4. `ImageEditorRoom.js` 的「拍照／從相簿選擇／空白畫布」idle 畫面，加入「最近草稿」列表（呼叫 `listDrafts("photo")`），點擊後以 `initialScene: draft.sceneJSON` 方式重新掛載編輯器（複用 §4.1 的還原路徑）。
5. 草稿數量需設上限（例如保留最近 10 筆），超過時刪除最舊的，避免 IndexedDB 無限增長。

**驗收標準：**

- 編輯中意外重新整理／關閉分頁，重新進入編輯室可看到並還原最近草稿。
- 草稿列表可個別刪除。

---

## 5. 執行路線圖

### 5.1 時程總覽

| Phase | 內容 | 預估工作量 | 建議時程 |
|---|---|---|---|
| **Phase 0** | P0-1～P0-3 全部 ＋ P1-1 第一步（誠實化按鈕）＋ P1-3／P1-6 | 約 7.75 人日 | 1.5～2 週（含測試與 code review） |
| **Phase 1** | P1-2、P1-4（匯出面板）、P1-5（草稿）、P1-1 第二步（吸附）、圖層面板、自由裁剪／自訂比例、曝光等進階調整、before/after、真正橡皮擦 | 依審核報告 §10 Phase 1 清單，估算約 15–20 人日 | 4～6 週 |
| **Phase 2** | 背景移除／物件移除、私隱人臉偵測、社交尺寸模板、批次處理、跨裝置草稿 | 需視是否採用第三方 API（如背景移除）大幅影響估算，建議先做技術選型 spike（2 人日）再估工時 | 待 Phase 1 完成後重新排期 |
| **Phase 3** | AI 進階能力（一鍵增強、AI 擴圖、放大／去噪） | 依賴外部 AI 服務選型與成本評估，非純前端工作量 | 待產品／商業評估 |

**建議：Phase 0 是唯一「不應該有爭議」的優先項目**——它修的是「使用者信任」層級的問題（作品遺失、假功能、靜默失真），與是否要往 Photoshop 或 Picsart 方向發展無關，任何路線都需要先有這個地基。

### 5.2 Phase 1 P2 項目量級參考（沿用審核報告 §6 P2 清單，補工作量級距）

| 項目 | 量級 | 備註 |
|---|---|---|
| 圖層／物件面板（排序/顯示/鎖定/複製/刪除） | 大（5–7 人日） | 需要新的 UI 面板＋ Fabric 物件狀態雙向綁定 |
| 自由裁剪／自訂比例／畫布尺寸 | 中（2–3 人日） | 現有裁剪框架可擴充，非從零開始 |
| 曝光／色溫／高光／陰影／清晰度／銳利／暗角 | 中（3–4 人日） | 多數可用 fabric filters 或簡單 canvas 像素運算實作，暗角需另外處理 |
| before/after、單項/全部 reset | 小（1–2 人日） | 依賴目前的 slider commit 架構即可疊加 |
| 背景移除／物件移除 | 大，且非純前端 | 需選型（本地模型 vs API），建議獨立立項 |
| 真正橡皮擦（像素級）／筆刷 opacity／hardness | 中（2–3 人日） | Fabric 的 `globalCompositeOperation` 可支援，需重構目前「整條 stroke 刪除」的假橡皮擦 |
| 鍵盤快捷鍵＋可及性基礎 | 中（3–4 人日） | 含 slider `aria` 關聯、`aria-live`、focus 管理，涵蓋審核報告 §7 已確認項目 |

此表僅供排期參考，實際估算應在各項目排入衝刺前由負責工程師覆核。

---

## 6. 驗收與品質保證

沿用審核報告 §11「建議驗收指標」作為 Phase 0／Phase 1 完成後的驗收依據，不重複列出。額外補充本計畫特有的驗證方式：

- **P0 驗收需要「操作序列測試」而非單一截圖**：例如 P0-2 的驗收必須是「匯入→加物件→undo→套用濾鏡」這種跨多步驟的序列，單看某一步的畫面無法暴露引用失效問題。
- **每個 P0/P1 項目建議搭配一個最小重現腳本**（可用 Playwright 或手動 QA checklist），因為這類 bug 屬於「狀態管理」而非「視覺」問題，光靠截圖 review 容易漏掉。
- 由於本次環境無法登入實機測試（審核報告 §2.2 已說明），**建議由工程團隊在合併前於本機／測試帳號完整跑過上述操作序列**，而非僅依賴 code review。

---

## 7. 風險與相依性

| 風險 | 影響 | 緩解 |
|---|---|---|
| P0-1／P0-2 的修改都涉及 `usePhotoEditorCore.js` 的核心 history／canvas 生命週期邏輯，兩者應合併在同一次改動中處理，避免互相踩腳 | 中 | Phase 0 建議按 §4.1→§4.2→§4.3 順序做，且做完 P0-2 的 `getBaseImage` 重構後再實作 P0-1 的還原路徑，因為 P0-1 還原後同樣需要正確辨識底圖 |
| `data` 屬性需要在所有 `toJSON`/`loadFromJSON` 呼叫處統一加上 `["data"]` 參數，容易遺漏 | 中 | 建議包一層 `serializeCanvas(canvas)`/`deserializeCanvas(canvas, json)` helper，取代目前分散呼叫 `canvas.toJSON()`／`canvas.loadFromJSON()` 的地方 |
| 匯出面板（P1-4）若同時要支援「快速匯出」與「更多選項」兩種入口，容易造成使用者困惑「完成」按鈕的行為改變 | 低中 | 建議快速匯出維持目前一鍵行為與預設值完全一致，只在使用者主動點「更多選項」時才看到新介面，把行為改變降到最低 |
| 背景移除等 AI 功能（Phase 2/3）非純前端可獨立完成的工作，會拖慢路線圖 | 高（若排期未預留） | 建議 Phase 2 開始前先做技術選型 spike，獨立於本改善計畫的工時估算 |

---

## 8. 總結與建議行動

1. **立即啟動 Phase 0**（約 7.75 人日）：這是唯一會直接造成使用者「作品遺失」或「被誤導」的問題集合，與產品定位方向無關，任何後續投資都應該建立在這個地基上。
2. **P1-1 對齊輔助按鈕的文案／存廢，是成本最低、應該最先處理的一項**——不需要等吸附邏輯開發完成，先讓功能「說到做到」。
3. Phase 1 建議按「圖層面板 → 自由裁剪／尺寸 → 進階色彩調整 → 真正橡皮擦 → 可及性」的順序執行，優先做「使用者會直接感受到」的能力，可及性修正雖然重要但屬於補強型工作，可與其他項目並行由不同工程師分工。
4. 背景移除等 AI 能力應獨立於本次改善計畫立項，因為其工作量取決於技術選型（自建模型／第三方 API／額度成本），現階段不應該與 Phase 0/1 的純前端工時混在同一個排程假設下。

**一句話：** 先把 Phase 0 的 7.75 人日做完，EVONCHAT 的圖片編輯器就能從「看起來能用」變成「真正可以信任」；這是後續所有功能擴充的必要前提，不是可選項。
