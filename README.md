# 基於 AI Harness 系統之強化學習貪食蛇安全駕馭架構研究

本專案實作了一套基於 **AI Harness（安全駕馭系統）** 的強化學習（RL）控制架構，並以經典的**貪食蛇遊戲（Snake Game）**為驗證載體。此研究旨在解決自主 Agent 在訓練初期因高頻率無效嘗試（如撞牆自殺）導致收斂速度過慢，以及無法過渡到真實安全關鍵（Safety-Critical）環境之痛點。

透過本系統，我們在 RL 代理（Agent）與遊戲環境（Environment）之間建構了一套「防自殺韁繩」控制層。**其核心哲學為「不修改大腦模型，只限制行為邊界」**，成功在不改動底層 RL 演算法的前提下，大幅降低訓練全期的自殺率，並顯著提升整體的收斂效率與存活週期。

---

## 📖 系統架構與設計原理

整體系統架構的動作轉換機制定義如下：

$$f(s_t, a_{rl}) = (a_{safe}, R_{penalty})$$

在每一個遊戲影格（Step）中，系統內部的運作流程如下：

```mermaid
graph TD
    A[環境狀態 Perception] -->|s_t| B[RL Agent 大腦]
    B -->|預期動作 a_rl| C[AI Harness 攔截層]
    C -->|1. 沙盒預判 Sandbox Simulator| D{判斷是否致命?}
    D -->|否| E[直接執行原動作]
    D -->|是 is_suicidal = True| F[2. 安全搜索 Safe Action Scanner]
    F -->|覆寫動作 a_safe| G[環境執行環境步進]
    E -->|動作放行 a_safe = a_rl| G
    G -->|回傳原始獎勵 R_env| H[3. 獎勵重塑 Reward Modifier]
    H -->|計算綜合理論獎勵 R_total| I[時間差分更新 Q-Table]
