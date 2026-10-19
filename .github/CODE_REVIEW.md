# Code Review Guidelines (代碼審查指南)

本專案致力於維持機器學習工程、統計嚴謹度與前端互動程式碼的高品質標準。所有提交至 `main` 分支的 Pull Request (PR) 或重大 Commit，均需遵循此審查標準。

---

## 🔍 Code Review 核心審查維度

### 1. 機器學習與資料科學規範 (ML & Statistical Integrity)
- [ ] **無資料外洩 (No Data Leakage)**：特徵標準化 (`StandardScaler`)、補值 (`SimpleImputer`) 必須在 `train_test_split` 之後分別對訓練集 fit、測試集 transform。
- [ ] **可復現性 (Reproducibility)**：所有涉及隨機抽樣的函式（如 `train_test_split`, `LassoCV`, K-Fold）必須明確設定 `random_state`。
- [ ] **防範虛擬變數陷阱 (Dummy Variable Trap)**：名目類別變數進行 One-Hot 編碼時，確認設定 `drop_first=True`。
- [ ] **評估指標完整性**：
  - 回歸問題必須同時檢視 **RMSE**（衡量誤差絕對幅度）與 **$R^2$**（衡量方差解釋比例）。
  - 特徵選取需以**測試集泛化指標**為決策依據，嚴禁單以訓練集 $R^2$ 評斷特徵優劣。
- [ ] **CRISP-DM 流程合規性**：筆記本結構需維持商業理解、資料理解、前處理、建模、評估到部署的邏輯閉環。

### 2. Python 程式碼規範
- [ ] **路徑規範**：全面禁止硬編碼本地路徑（如 `C:\...` 或 `/home/...`），一律使用相對路徑或公開 URL 串流讀取。
- [ ] **相依套件清晰**：新增套件需同步更新至腳本頂部或環境檢測列表。
- [ ] **序列化產物隔離**：訓練產生的模型二進位檔（`*.pkl`）嚴禁入庫，必須受 `.gitignore` 管控。

### 3. 前端網頁與視覺化規範 (`web/`)
- [ ] **靜態無伺服器相容**：前端所有邏輯必須在瀏覽器端完全獨立執行，相容於 GitHub Pages。
- [ ] **記憶體釋放**：動態更新圖表時，需確認舊有 `Chart.js` 實例有被正確銷毀 (`chart.destroy()`)，避免記憶體洩漏。
- [ ] **跨螢幕響應式佈局**：所有視覺化組件需在手機端與桌機端皆能正常操作滑桿與滾動表格。

### 4. Git 與安全性規範
- [ ] **敏感資訊隔離**：不提交任何 API Key、Token 或私人參考資料夾（`Reference/`）。
- [ ] **Commit 訊息規範**：採用語意化提交訊息（如 `feat:`, `fix:`, `docs:`, `refactor:`）。

---

## 🛠️ 如何請求 AI Code Review Agent

在 GitHub Pull Request 或 Antigravity IDE 聊天室中，您可以輸入：
* `@copilot review this pull request`
* 或在 Antigravity 中執行 `/code-review` / 輸入「請依據 code-review skill 審查代碼」
即可自動調用 AI Agent 進行多維度深度審查。
