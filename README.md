# AIoT-DA 多元線性回歸專題 (50_Startups Profit Prediction)

本專案遵循 **CRISP-DM（跨領域資料採掘標準流程）** 架構，針對 Kaggle 經典新創公司資料集（50_Startups）進行多元線性回歸（Multiple Linear Regression）建模，並透過前向逐步特徵選取（Forward Feature Selection）探索最佳獲利預測變數組合。

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/contemplator/nchu-startup-50/blob/main/Startup_50_MLR_CRISP_DM.ipynb)
[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-blue?style=flat&logo=github)](https://contemplator.github.io/nchu-startup-50/)

---

## 🌐 互動式 Web 儀表板 (Live Dashboard)

專案提供已部署至 GitHub Pages 的動態互動儀表板：

👉 **[點此造訪 Live Demo: https://contemplator.github.io/nchu-startup-50/](https://contemplator.github.io/nchu-startup-50/)**

![Web Dashboard Preview](./dashboard_preview.png)

- 🎚️ **前向特徵選取探索器**：動態滑動特徵數量（1~5），即時聯動 RMSE 與 R-squared 雙折線圖與表格。
- 💡 **過擬合智能警示**：動態判別最佳泛化點（2 特徵）與雜訊過擬合區間（3~5 特徵）。
- 🧮 **What-If 利潤試算機**：拖曳研發與行銷預算滑桿，即時以最佳回歸方程式推算預期年利潤。
- 📈 **模型診斷與殘差分析**：測試集 10 筆樣本之實際值 vs 預測值對角線圖與殘差分佈。
- 📥 **自訂 CSV 即時回歸運算 (WebAssembly Pyodide)**：支援拖曳上傳或貼上自訂資料集，純前端執行 CRISP-DM 前向選取與多元回歸。

---

## 📥 自訂資料集即時分析（以 Spotify 為例）

本平台內建瀏覽器端 WebAssembly Python 運算引擎（Pyodide + `scikit-learn`），使用者可直接匯入自訂 CSV 資料集進行前向特徵選取與多元線性回歸。

### 🎵 經典案例操作指南：Spotify 114k Tracks Dataset

[Kaggle - Spotify 歌曲資料](https://www.kaggle.com/datasets/maharshipandya/-spotify-tracks-dataset)

以熱門的 Spotify 歌曲特徵資料集（114,002 列）為例，展示完整的 CRISP-DM 資料準備與防呆機制：

1. **拖曳上傳資料集**：
   - 切換至「**➕ 自訂資料集**」分頁，拖入 `dataset.csv`。
   - 平台採用串流預覽機制，僅預覽前 25 列資料，避免大檔案造成瀏覽器延遲卡頓。
2. **切換目標預測變數 ($y$)**：
   - **常見錯誤**：資料集最後一欄為 `track_genre`（曲風文字標籤），若直接分析會觸發演算法任務型態防呆：
     > `⚠️ 目標欄位「track_genre」不是數值型別（目前型別為 object）。多元線性回歸的預測目標必須為連續數值！`
   - **正確操作**：點擊「**🎯 目標預測變數 (y)**」下拉選單，切換選取 **`popularity`**（歌曲熱門度，0~100 之連續數值）。
3. **CRISP-DM 智慧容錯清理生效**：
   - **自適應缺失值處理**：Spotify 資料集中有 1 筆樣本缺少歌手與專輯資訊（缺失率僅 0.00088%）。系統偵測缺失比例 $\le 10\%$，將自動執行 `df.dropna()` 剔除該樣本，並提示：
     > `💡 CRISP-DM 智慧容錯清理已生效：偵測到 1 筆包含空值 (NaN) 之樣本（佔比 0.00%），已依 CRISP-DM 資料準備規範自動清理剔除。`
   - **高基數文字標題過濾**：自動排除 `track_id`、`artists`、`album_name` 等超過 30 種文字分類之純文字欄位（依循 CRISP-DM 實務與 CarDekho 排除 Car_Name 設計），避免虛擬變數維度爆炸，專注於聲學特徵（如 `danceability`, `energy`, `loudness` 等）。

---

### ⚠️ 資料異常與嚴格把關機制（錯誤提示說明）

當上傳的資料集未通過機器學習回歸基本假設時，系統會立即彈出明確的錯誤說明：

| 異常情境           | 觸發原因與門檻                                    | 系統提示錯誤訊息                                                                                                    |
| :----------------- | :------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------ |
| **缺失值過多**     | 包含 NaN 空值且缺失列數佔比 **$> 10\%$**          | `⚠️ 資料集缺失值比例過高（共 X 筆，佔比 Y%）：「欄位名」包含 N 筆空值...。為避免模型失真，請先進行特徵清理或補值！` |
| **目標變數非數值** | 選擇的預測目標 $y$ 為文字/類別（屬於分類任務）    | `⚠️ 目標欄位「...」不是數值型別（目前型別為 object）。多元線性回歸的預測目標必須為連續數值！`                       |
| **樣本數量不足**   | 資料集有效列數 **$< 10$ 筆**，無法完成 80/20 切分 | `⚠️ 資料樣本數過少（僅 X 筆）。回歸分析與 80/20 訓練/測試集切分至少需要 10 筆以上資料。`                            |
| **特徵欄位缺失**   | 除目標欄位外無其他可用特徵，或特徵變異數皆為 0    | `⚠️ 除目標欄位外，未檢測到任何可用特徵自變數 (X)。`                                                                 |

---

## 📁 專案檔案清單

- **[Startup_50_MLR_CRISP_DM.ipynb](./Startup_50_MLR_CRISP_DM.ipynb)**：50_Startups 利潤預測 Jupyter Notebook，完整涵蓋 CRISP-DM 六步驟、前向特徵選取演算法與模型診斷。
- **[Boston_Housing_MLR_CRISP_DM.ipynb](./Boston_Housing_MLR_CRISP_DM.ipynb)**：Boston Housing 房價預測 Jupyter Notebook，實作五大特徵選取方法（Forward, Backward, Lasso, RFE, SelectKBest）與 1~13 特徵雙折線圖評估。
- **[CarDekho_Used_Car_Price_MLR_CRISP_DM.ipynb](./CarDekho_Used_Car_Price_MLR_CRISP_DM.ipynb)**：CarDekho 二手車價格預測 Jupyter Notebook，涵蓋車齡衍生特徵工程、五大特徵選取方法與 1~8 特徵折線圖評估。
- **[dashboard_preview.png](./dashboard_preview.png)**：互動式 Web 儀表板執行與過擬合警示預覽截圖。
- **[web/](./web/)**：Clean Light Academic 風格的靜態互動網頁（`index.html`, `style.css`, `app.js`, `data.json`）。
- **[export_web_data.py](./export_web_data.py)**：機器學習資料處理與前端 JSON 匯出腳本。
- **[.github/workflows/deploy.yml](./.github/workflows/deploy.yml)**：GitHub Actions CI/CD 自動化建置與 Pages 部署流程。
- **[assignment_result_plot.png](./assignment_result_plot.png)**：特徵數量對應 RMSE 與 R-squared 之高解析度折線圖。

---

## 🚀 如何執行

### 方式 A：本地 VS Code / Jupyter Notebook

1. 直接在 VS Code 側邊欄點擊打開 [Startup_50_MLR_CRISP_DM.ipynb](./Startup_50_MLR_CRISP_DM.ipynb)。
2. 本筆記本的所有程式格已事先執行完畢，所有折線圖、熱力圖、殘差圖與表格輸出均已內嵌可見。
3. 若需重新執行，點擊筆記本頂部「**全部執行 (Run All)**」即可。

### 方式 B：Google Colab

1. 將 `Startup_50_MLR_CRISP_DM.ipynb` 上傳至 Google Drive 或 GitHub。
2. 透過 Google Colab 打開該檔案。
3. 點擊「**代碼執行階段 -> 全部執行**」，環境會自動下載依賴套件並直接串流資料集完成分析。
