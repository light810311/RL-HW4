import type { Position } from './SnakeEnvironment';
import { GRID_SIZE } from './SnakeEnvironment';

export class AIHarness {
  useHarness: boolean;
  interceptCount: number;
  penaltyReward: number;

  constructor(useHarness: boolean = true) {
    this.useHarness = useHarness;
    this.interceptCount = 0;
    this.penaltyReward = -5; // Penalty for intercepting
  }

  resetStats() {
    this.interceptCount = 0;
  }

  inspectAndOverride(
    snake: Position[],
    rlAction: number,
    apple: Position // 新增：傳入蘋果位置，讓安全動作搜索器能做出智慧決策
  ): { finalAction: number; harnessPenalty: number; isIntercepted: boolean } {
    if (!this.useHarness) {
      return { finalAction: rlAction, harnessPenalty: 0, isIntercepted: false };
    }

    const head = snake[0];
    
    // Tool 1: Future_State_Simulator (預測下一步)
    const getNextPos = (action: number): Position => {
      const pos = { ...head };
      switch (action) {
        case 0: pos.y -= 1; break; // Up
        case 1: pos.y += 1; break; // Down
        case 2: pos.x -= 1; break; // Left
        case 3: pos.x += 1; break; // Right
      }
      return pos;
    };

    const isSuicidal = (pos: Position): boolean => {
      // Wall collision
      if (pos.x < 0 || pos.x >= GRID_SIZE || pos.y < 0 || pos.y >= GRID_SIZE) {
        return true;
      }
      // Self collision
      return snake.some(segment => segment.x === pos.x && segment.y === pos.y);
    };

    const intendedPos = getNextPos(rlAction);
    const danger = isSuicidal(intendedPos);

    if (danger) {
      this.interceptCount++;
      
      // Tool 2: Safe_Action_Scanner (智慧安全動作搜索)
      // 🔑 核心升級：不再隨機選取安全方向，而是選擇「距離蘋果最近」的安全動作
      const allActions = [0, 1, 2, 3];
      
      let bestAction = rlAction; // fallback
      let bestDistance = Infinity;
      let hasSafeAction = false;

      for (const act of allActions) {
        const nextPos = getNextPos(act);
        if (!isSuicidal(nextPos)) {
          hasSafeAction = true;
          // 計算該安全動作與蘋果之間的曼哈頓距離 (Manhattan Distance)
          const dist = Math.abs(nextPos.x - apple.x) + Math.abs(nextPos.y - apple.y);
          if (dist < bestDistance) {
            bestDistance = dist;
            bestAction = act;
          }
        }
      }

      return {
        finalAction: hasSafeAction ? bestAction : rlAction, // 無路可走則維持原動作 (真正死局)
        harnessPenalty: this.penaltyReward,
        isIntercepted: true
      };
    }

    return { finalAction: rlAction, harnessPenalty: 0, isIntercepted: false };
  }
}
