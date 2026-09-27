# 資料、財務與銷售 Skills

## 接入範圍

訪客模式既有的 Skills 選單新增 12 個專業指令範本，另加入使用者後續提供的
Excel Generator，合計 27 個範本（6 個一般、21 個專業）。選取後使用原有 `prepareGuestSkillMessage` 流程，
將方法與資料欄位填入輸入框，完整保留草稿，由使用者編輯及手動發送。

這次不啟用訪客 AI API，也不改會員 AI、登入、聊天資料、權限或發送邏輯。
沒有移植 AI Office 的 Runtime Registry、DuckDB、精確計算器或文件產生工具。
選單及範本都明示執行／驗證限制，不把指令範本當成已具備執行工具的代理。

## 來源與分類

方法改編自使用者提供的 AI Office Claude 1 專案中同名 `SKILL.md`，並參照其
數值完整性、獨立驗算、情境模型、財務底稿、銷售預測、來源追溯與人工覆核規則。
匯入前已逐一確認 12 份專案主檔與執行副本的 SHA-256 一致。
這是版本化的前端範本，不是對使用者電腦資料夾的即時同步，也不包含私人資料。

| 分類 | 方法 ID | 顯示名稱 |
| --- | --- | --- |
| 財務控制 | budget-modeling-controls | 預算模型控制 |
| 資料與模型 | capacity-modeling | 產能模型 |
| 財務控制 | commission-rule-formalization | 佣金規則正式化 |
| 資料與模型 | data-query-methodology | 資料查詢方法 |
| 財務控制 | financial-variance-method | 財務差異分析 |
| 資料與模型 | formula-specification-verification | 公式規格驗證 |
| 財務控制 | invoice-draft-validation | 發票草稿驗證 |
| 銷售規劃 | pipeline-coverage-analysis | 銷售管線覆蓋分析 |
| 財務控制 | reconciliation-control-method | 對帳控制方法 |
| 銷售規劃 | sales-call-strategy | 銷售通話策略 |
| 銷售規劃 | sales-forecast-scenario-modeling | 銷售預測情境模型 |
| 銷售規劃 | sales-quote-pricing-control | 報價與定價控制 |
| 試算表與報表 | excel-generator | Excel 試算表製作 |

Excel Generator 改編自使用者附件 `SKILL 2.md`；保留 Overview 導覽、資料／公式
格式、主題與可讀性、圖表、凍結／篩選和輸入驗證規範。此項不是 Excel 下載功能。
沒有產檔工具時僅提供規格與表格，不假造檔案或下載連結。其財務估值／建模
優先使用專用 finance-pro-playbooks 規範的邊界保留，未提供時要求補充，不套用一般裝飾。

## 保留的邊界

- 數據必須可追溯，缺值不能補成零，幣別、單位與期間不可混用。
- 沒有實際計算／查詢工具與紀錄時，提供規格或計畫，數值標待驗證。
- 不把同一公式重算稱為獨立驗證，不自行放寬測試容差。
- 佣金重大歧義交由人選定；財務、稅務、薪酬與合約列明覆核責任。
- 發票草稿不代表已開立，報價不代表已核准，銷售分析不代表 CRM 已同步。
- 未啟用外部工具，不宣稱已產生檔案、聯絡客戶或寫入任何外部服務。

## 驗證入口

- `__tests__/guestSkills.test.js`：清單、分類搜尋、保留草稿與方法關鍵條件。
- `__tests__/GuestSkillsIntegration.test.js`：實際訪客元件逐項選取、搜尋、
  關閉／重開選單；確認只填入草稿，沒有呼叫 AI 或寫入資料。
- 本機預覽使用實際 Skills 元件及本機輸入框，不連接正式資料。
