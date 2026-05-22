# 基於 AI Harness 系統之強化學習貪食蛇安全駕馭架構研究

本專案實作了一套基於 **AI Harness（安全駕馭系統）** 的強化學習（RL）控制架構，以經典的**貪食蛇遊戲（Snake Game）**為驗證載體。此研究旨在解決自主 Agent 在訓練初期因高頻率無效嘗試（如撞牆自殺）導致收斂速度過慢，以及無法過渡到真實安全關鍵（Safety-Critical）環境之痛點。

透過本系統，我們在 RL 代理（Agent）與遊戲環境（Environment）之間建構了一套「防自殺韁繩」控制層，成功在不改動底層 RL 演算法的前提下，達成訓練全期**「零自殺率」**之目標，並大幅提升收斂效率。

---

## 📖 系統架構與設計原理

本系統的核心哲學為 **「不修改大腦模型，只限制行為邊界」**。整體系統架構的動作轉換機制定義如下：

$$f(s_t, a_{rl}) = (a_{safe}, R_{penalty})$$

在每一個遊戲影格（Step）中，系統內部的運作流程如下：

```mermaid
graph TD
    A[環境狀態 Perception] -->|s_t| B[RL Agent 大腦]
    B -->|預期動作 a_rl| C[AI Harness 攔截層]
    C -->|1. 沙盒預判 Sandbox Simulator| D{判斷是否致命?}
    D -->|否| E[直接執行原動作]
    D -->|是 (is_suicidal = True)| F[2. 安全搜索 Safe Action Scanner]
    F -->|覆寫動作 a_safe| G[環境執行環境步進]
    E -->|動作放行 a_safe = a_rl| G
    G -->|回傳原始獎勵 R_env| H[3. 獎勵重塑 Reward Modifier]
    H -->|計算綜合理論獎勵 R_total| I[時間差分更新 Q-Table]
```

### AI Harness 控制層的三大核心防禦維度

1. **安全沙盒預判 (Sandbox Simulation)**
   在動作真正施加於遊戲環境前，Harness 在虛擬內存中模擬下一步的空間座標。若新座標超出邊界或存在於蛇身內部，則 `is_suicidal` 觸發 `True`。
2. **硬體動作沒收 (Action Overriding)**
   當預判結果為致命，硬性沒收該決策權，並對剩餘的三個方向進行周邊掃描，強行覆寫為安全方向 $a_{safe}$，保護主體不受損壞。
3. **脈絡與獎勵重塑 (Context & Reward Shaping)**
   將 Harness 的介入轉化為「導師信號（Guidance Signal）」回傳給大腦，給予虛擬懲罰值 $R_{penalty} = -5$。確保大腦雖然被救了一命，但依然能學到「剛剛那個想法是錯的」。

---

## 🛠️ 開發環境建構

本專案使用現代前端工具鏈 **Vite + React + TypeScript** 進行實作，並使用 **HTML5 Canvas** 進行渲染，以確保能以極高幀率進行即時強化學習運算與數據可視化。

### 1. 前置準備
請確保您的系統中已安裝 [Node.js](https://nodejs.org/)（建議 LTS 版本，例如 v18 或 v20 以上）。

### 2. 安裝步驟
1. 開啟終端機（Terminal）或 PowerShell，切換到本專案的目錄：
   ```bash
   cd C:\Users\light\Desktop\RL-HW\RL-HW4\snake-harness-app
   ```
2. 安裝所有相依套件（包括 `react`、`recharts`、`lucide-react` 等）：
   ```bash
   npm install
   ```

### 3. 本地運行開發伺服器
安裝完成後，執行以下命令啟動開發伺服器：
```bash
npm run dev
```
啟動成功後，終端機會顯示本地服務網址：
```text
  ➜  Local:   http://localhost:5173/
```
請用瀏覽器打開 **[http://localhost:5173/](http://localhost:5173/)** 即可看到即時對照的實驗儀表板！

---

## 📊 實驗評估指標

在儀表板中，系統將同時執行並對比以下兩組：
* **對照組 A (Baseline)**: 純粹的強化學習模型（Q-Learning），直接與環境互動，無任何保護。
* **實驗組 B (Proposed)**: 相同的強化學習模型，外部加裝本研究之 AI Harness 系統。

### 預期指標對比表

| 評估指標 (Metrics) | 對照組 A (純 RL) | 實驗組 B (RL + Harness) | 指標學術意義 |
| :--- | :--- | :--- | :--- |
| **累積死亡次數** | 高 (快速爬升) | **絕對為 0 次** | 驗證 Harness 的零故障安全性與硬體防護能力。 |
| **收斂至特定分數所需回合** | 慢 (因頻繁重置中斷學習) | **快 (預期提升 2-3 倍)** | 驗證安全性防護是否能加速核心業務學習。 |
| **平均每回合存活步數** | 初期極低，隨訓練緩慢爬升 | **初期即達到最高水準** | 證明系統在模型尚未成熟前，即具備長週期任務執行力。 |

---

## 🌐 部署與分享指引

本專案已被配置為**相對路徑支援 (`base: './'`)**，因此可以輕鬆部署於任何靜態網頁託管平台。

### 方式一：編譯為靜態網頁（本機直接打開）
如果您想要打包專案，請執行：
```bash
npm run build
```
這會在專案根目錄產生一個 `dist` 資料夾，該資料夾包含了完整的靜態檔案，可以直接放置於任何伺服器。

### 方式二：部署至 GitHub Pages
1. 在本機安裝 `gh-pages` 套件：
   ```bash
   npm install gh-pages --save-dev
   ```
2. 在 `package.json` 的 `"scripts"` 區塊新增：
   ```json
   "predeploy": "npm run build",
   "deploy": "gh-pages -d dist"
   ```
3. 執行以下命令即可一鍵發佈至您 GitHub 的 Pages 服務：
   ```bash
   npm run deploy
   ```

### 方式三：使用 Vercel 一鍵部署 (最推薦)
1. 將專案程式碼推送至您的 GitHub 儲存庫。
2. 前往 [Vercel](https://vercel.com/) 導入該 GitHub 儲存庫。
3. 點擊 **Deploy**，平台將在 30 秒內自動建構完成並提供您的專案專屬公開連結！
