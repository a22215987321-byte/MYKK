# EvonChat 專案指示

## 效率規則

**小改動**（改顏色數值、加/改單一屬性、文字內容、簡單樣式微調）：
- 不要安裝或啟動 Playwright 做視覺驗證
- 不要跑 `npm run build`
- push 完不用輪詢部署狀態，直接回報完成即可
- 改完附上 diff 或說明改了什麼就好，不用截圖

**大改動**（新功能、共用元件、資料流程、UI 大改版）：
- 照平常流程做完整驗證（本地確認、build、確認部署成功）
- 若牽涉到顏色/版面調整，先跟使用者要精確色碼或數值，不要自己反覆截圖用猜的去調整
- `npm run build` 前確認沒有 `npm run dev` 還在跑（同時跑會弄壞 `.next` 快取，需要 `rm -rf .next` 才能救回來）——build 完如果還要繼續用 dev server 驗證，記得先清快取再重啟

## 常用檔案位置

- 主題配色：`styles/theme.css`
- 主題切換 UI：`components/ThemeToggle.js`
- 聊天室主體（側欄、雙大方塊分頁系統、功能路由）：`components/ChatRoom.js`
- 側欄功能項目元件：`components/nav/NavItem.js`
- 頂部分頁列（分頁列、拖曳邏輯）：`components/nav/TabbedBlock.js`
- GitHub 熱門頁面：`components/GithubTrendingRoom.js`
- AI Office 模式：`components/office/OfficeMode.js`、`components/office/office.css`
- AI 助手後端（DeepSeek／OpenRouter 路由）：`pages/api/ai/chat.js`
- 自製功能圖示素材：`public/icons/`
