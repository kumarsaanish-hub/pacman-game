import type { Direction } from './types';

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
  w: 'UP',
  W: 'UP',
  s: 'DOWN',
  S: 'DOWN',
  a: 'LEFT',
  A: 'LEFT',
  d: 'RIGHT',
  D: 'RIGHT',
};

export class InputHandler {
  private queuedDirection: Direction | null = null;
  private escapePressed = false;
  private restartPressed = false;
  private anyKeyPressed = false;

  private readonly onKeyDown: (e: KeyboardEvent) => void;

  constructor() {
    this.onKeyDown = (e: KeyboardEvent) => {
      const dir = KEY_TO_DIRECTION[e.key];
      if (dir) {
        this.queuedDirection = dir;
        this.anyKeyPressed = true;
        return;
      }
      if (e.key === 'Escape') {
        this.escapePressed = true;
        this.anyKeyPressed = true;
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        this.restartPressed = true;
        this.anyKeyPressed = true;
        return;
      }
      this.anyKeyPressed = true;
    };

    window.addEventListener('keydown', this.onKeyDown);
  }

  getQueuedDirection(): Direction | null {
    return this.queuedDirection;
  }

  clearQueue(): void {
    this.queuedDirection = null;
  }

  consumeEscape(): boolean {
    if (this.escapePressed) {
      this.escapePressed = false;
      return true;
    }
    return false;
  }

  consumeRestart(): boolean {
    if (this.restartPressed) {
      this.restartPressed = false;
      return true;
    }
    return false;
  }

  consumeAnyKey(): boolean {
    if (this.anyKeyPressed) {
      this.anyKeyPressed = false;
      return true;
    }
    return false;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
