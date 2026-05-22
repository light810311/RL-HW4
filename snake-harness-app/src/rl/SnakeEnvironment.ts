export const GRID_SIZE = 15; // 15x15 grid

export type Position = { x: number; y: number };

export class SnakeEnvironment {
  snake: Position[];
  apple: Position;
  score: number;
  steps: number;
  isGameOver: boolean;

  constructor() {
    this.snake = [
      { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) }
    ];
    this.apple = this.generateApple();
    this.score = 0;
    this.steps = 0;
    this.isGameOver = false;
  }

  generateApple(): Position {
    let newApple: Position;
    while (true) {
      newApple = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      // Make sure apple doesn't spawn on snake
      const onSnake = this.snake.some(
        (segment) => segment.x === newApple.x && segment.y === newApple.y
      );
      if (!onSnake) break;
    }
    return newApple;
  }

  reset() {
    this.snake = [
      { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) }
    ];
    this.apple = this.generateApple();
    this.score = 0;
    this.steps = 0;
    this.isGameOver = false;
  }

  step(action: number): { reward: number; done: boolean } {
    // 0: Up, 1: Down, 2: Left, 3: Right
    if (this.isGameOver) return { reward: 0, done: true };

    this.steps++;
    const head = this.snake[0];
    const newHead = { ...head };

    switch (action) {
      case 0: newHead.y -= 1; break; // Up
      case 1: newHead.y += 1; break; // Down
      case 2: newHead.x -= 1; break; // Left
      case 3: newHead.x += 1; break; // Right
    }

    // Check collision with walls
    if (
      newHead.x < 0 ||
      newHead.x >= GRID_SIZE ||
      newHead.y < 0 ||
      newHead.y >= GRID_SIZE
    ) {
      this.isGameOver = true;
      return { reward: -10, done: true }; // High penalty for dying
    }

    // Check collision with self
    const hitSelf = this.snake.some(
      (segment) => segment.x === newHead.x && segment.y === newHead.y
    );
    if (hitSelf) {
      this.isGameOver = true;
      return { reward: -10, done: true };
    }

    this.snake.unshift(newHead);

    // Check if apple eaten
    if (newHead.x === this.apple.x && newHead.y === this.apple.y) {
      this.score += 1;
      this.apple = this.generateApple();
      return { reward: 10, done: false }; // High reward for eating apple
    } else {
      this.snake.pop(); // Remove tail if not grown
      // Slight penalty for moving to encourage efficiency
      return { reward: -0.1, done: false };
    }
  }

  getState(): string {
    const head = this.snake[0];
    // Simple state: dx, dy towards apple
    const dx = this.apple.x > head.x ? 1 : this.apple.x < head.x ? -1 : 0;
    const dy = this.apple.y > head.y ? 1 : this.apple.y < head.y ? -1 : 0;
    
    // Also include immediate danger in 4 directions?
    // Let's keep it very simple to ensure fast convergence as requested.
    // For a bit more robust RL, let's include if there's danger 1 step ahead in each direction
    const dangerUp = head.y - 1 < 0 || this.snake.some(s => s.x === head.x && s.y === head.y - 1) ? 1 : 0;
    const dangerDown = head.y + 1 >= GRID_SIZE || this.snake.some(s => s.x === head.x && s.y === head.y + 1) ? 1 : 0;
    const dangerLeft = head.x - 1 < 0 || this.snake.some(s => s.x === head.x - 1 && s.y === head.y) ? 1 : 0;
    const dangerRight = head.x + 1 >= GRID_SIZE || this.snake.some(s => s.x === head.x + 1 && s.y === head.y) ? 1 : 0;

    return `${dx},${dy},${dangerUp},${dangerDown},${dangerLeft},${dangerRight}`;
  }
}
