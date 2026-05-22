export class SnakeAgent {
  qTable: Record<string, number[]>;
  actions: number[];
  lr: number;
  discount: number;
  epsilon: number;
  minEpsilon: number;
  decayRate: number;

  constructor() {
    this.qTable = {};
    this.actions = [0, 1, 2, 3]; // 0: Up, 1: Down, 2: Left, 3: Right
    this.lr = 0.1;
    this.discount = 0.9;
    this.epsilon = 1.0; // Start with full exploration
    this.minEpsilon = 0.01;
    this.decayRate = 0.995;
  }

  reset() {
    this.qTable = {};
    this.epsilon = 1.0;
  }

  decayEpsilon() {
    if (this.epsilon > this.minEpsilon) {
      this.epsilon *= this.decayRate;
    }
  }

  chooseAction(state: string, forceExploration: boolean = false): number {
    if (!this.qTable[state]) {
      this.qTable[state] = [0.0, 0.0, 0.0, 0.0];
    }

    if (forceExploration || Math.random() < this.epsilon) {
      // Explore
      return this.actions[Math.floor(Math.random() * this.actions.length)];
    } else {
      // Exploit
      const qValues = this.qTable[state];
      const maxQ = Math.max(...qValues);
      
      // If there are multiple actions with the same max Q, randomly select one of them
      const bestActions = this.actions.filter((action) => qValues[action] === maxQ);
      return bestActions[Math.floor(Math.random() * bestActions.length)];
    }
  }

  updateQTable(state: string, action: number, reward: number, nextState: string) {
    if (!this.qTable[nextState]) {
      this.qTable[nextState] = [0.0, 0.0, 0.0, 0.0];
    }
    if (!this.qTable[state]) {
      this.qTable[state] = [0.0, 0.0, 0.0, 0.0];
    }

    const oldQ = this.qTable[state][action];
    const nextMaxQ = Math.max(...this.qTable[nextState]);
    const newQ = oldQ + this.lr * (reward + this.discount * nextMaxQ - oldQ);
    
    this.qTable[state][action] = newQ;
  }
}
