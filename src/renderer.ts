import type { GameState, MazeGrid, PacManEntity, GhostEntity, ScorePopup } from './types';

const TILE_SIZE = 20;
const COLS = 28;
const ROWS = 31;
const CANVAS_WIDTH = COLS * TILE_SIZE;   // 560
const CANVAS_HEIGHT = ROWS * TILE_SIZE;  // 620

const GHOST_COLORS: Record<string, string> = {
  Blinky: '#FF0000',
  Pinky:  '#FFB8FF',
  Inky:   '#00FFFF',
  Clyde:  '#FFB852',
};

export class Renderer {
  private ctx: CanvasRenderingContext2D | null;
  private enabled: boolean;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.ctx = null;
      this.enabled = false;
      const errorEl = document.getElementById('error-message');
      if (errorEl) {
        errorEl.style.display = 'block';
        errorEl.textContent = 'Unable to initialize canvas 2D context. Please use a modern browser.';
      }
    } else {
      this.ctx = ctx;
      this.enabled = true;
    }
  }

  render(state: GameState): void {
    if (!this.enabled || !this.ctx) return;

    const ctx = this.ctx;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.drawMaze(state.maze);
    this.drawScorePopups(state.scorePopups);

    // Draw fruit if present
    if (state.fruit) {
      const fx = state.fruit.tile.col * TILE_SIZE + TILE_SIZE / 2;
      const fy = state.fruit.tile.row * TILE_SIZE + TILE_SIZE / 2;

      // Glow effect
      const glowColor = state.fruit.emoji === '🍒' ? '#ff4466'
                      : state.fruit.emoji === '🍊' ? '#ff8800'
                      : '#ffee00';
      ctx.save();
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 14;
      ctx.font = `${TILE_SIZE * 1.4}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(state.fruit.emoji, fx, fy);
      ctx.restore();
    }

    this.drawPacMan(state.pacman);

    for (const ghost of state.ghosts) {
      this.drawGhost(ghost);
    }

    this.drawHUD(state.score, state.lives, state.level);
    this.drawOverlay(state.phase, state.score);
  }

  drawMaze(maze: MazeGrid): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    for (let row = 0; row < maze.length; row++) {
      for (let col = 0; col < maze[row].length; col++) {
        const cell = maze[row][col];
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;
        const cx = x + TILE_SIZE / 2;
        const cy = y + TILE_SIZE / 2;

        if (cell === 'WALL') {
          ctx.fillStyle = '#0000CC';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        } else if (cell === 'DOT') {
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(cx, cy, 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (cell === 'POWER_PELLET') {
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        // EMPTY, TUNNEL, GHOST_HOUSE — black background (already cleared)
      }
    }
  }

  drawPacMan(pacman: PacManEntity): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    const cx = pacman.pixelPos.x + TILE_SIZE / 2;
    const cy = pacman.pixelPos.y + TILE_SIZE / 2;
    const radius = TILE_SIZE * 0.45;
    const mouthRad = (pacman.mouthAngle * Math.PI) / 180;

    // Rotation based on direction
    let rotation = 0;
    switch (pacman.direction) {
      case 'RIGHT': rotation = 0; break;
      case 'DOWN':  rotation = Math.PI / 2; break;
      case 'LEFT':  rotation = Math.PI; break;
      case 'UP':    rotation = -Math.PI / 2; break;
      default:      rotation = 0;
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, mouthRad, Math.PI * 2 - mouthRad);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawGhost(ghost: GhostEntity): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    const x = ghost.pixelPos.x;
    const y = ghost.pixelPos.y;
    const w = TILE_SIZE;
    const h = TILE_SIZE;
    const r = w / 2; // corner radius

    // Determine body color
    let bodyColor: string;
    if (ghost.mode === 'FRIGHTENED') {
      if (ghost.frightenedFlashing) {
        // Alternate blue/white — use a simple time-based toggle via a class field isn't available,
        // so we use a deterministic approach: flash based on current ms
        bodyColor = (Date.now() % 500 < 250) ? '#FFFFFF' : '#0000FF';
      } else {
        bodyColor = '#0000FF';
      }
    } else if (ghost.mode === 'EATEN') {
      bodyColor = 'transparent';
    } else {
      bodyColor = GHOST_COLORS[ghost.name] ?? '#FF0000';
    }

    ctx.save();
    ctx.translate(x, y);

    // Draw body (rounded top, wavy bottom)
    if (ghost.mode !== 'EATEN') {
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      // Top rounded arc
      ctx.arc(r, r, r, Math.PI, 0);
      // Right side down
      ctx.lineTo(w, h - 4);
      // Wavy bottom (3 bumps)
      const bumpW = w / 3;
      ctx.lineTo(w - bumpW * 0, h - 4);
      ctx.quadraticCurveTo(w - bumpW * 0.5, h + 2, w - bumpW * 1, h - 4);
      ctx.quadraticCurveTo(w - bumpW * 1.5, h + 2, w - bumpW * 2, h - 4);
      ctx.quadraticCurveTo(w - bumpW * 2.5, h + 2, w - bumpW * 3, h - 4);
      ctx.lineTo(0, h - 4);
      ctx.closePath();
      ctx.fill();
    }

    // Draw eyes (always visible unless eaten)
    if (ghost.mode !== 'EATEN') {
      const eyeY = r * 0.7;
      const eyeRadius = r * 0.28;
      const pupilRadius = eyeRadius * 0.55;

      // Left eye white
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(r * 0.55, eyeY, eyeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Right eye white
      ctx.beginPath();
      ctx.arc(r * 1.45, eyeY, eyeRadius, 0, Math.PI * 2);
      ctx.fill();

      if (ghost.mode !== 'FRIGHTENED') {
        // Dark pupils
        ctx.fillStyle = '#000088';
        ctx.beginPath();
        ctx.arc(r * 0.55, eyeY, pupilRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(r * 1.45, eyeY, pupilRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // EATEN: just draw eyes (no body)
      const eyeY = r * 0.7;
      const eyeRadius = r * 0.28;
      const pupilRadius = eyeRadius * 0.55;

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(r * 0.55, eyeY, eyeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(r * 1.45, eyeY, eyeRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000088';
      ctx.beginPath();
      ctx.arc(r * 0.55, eyeY, pupilRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(r * 1.45, eyeY, pupilRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawHUD(score: number, lives: number, level: number): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // HUD is drawn outside the maze area — we use a strip at the bottom
    // Canvas is 560×620; maze is 31 rows × 20px = 620px, so we overlay at top/bottom rows
    // Top strip: score (row 0 area) and level (top-right)
    // Bottom strip: lives (row 30 area)

    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'middle';

    // Score — top-left
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 4, TILE_SIZE / 2);

    // Level — top-right
    ctx.textAlign = 'right';
    ctx.fillText(`LVL: ${level}`, CANVAS_WIDTH - 4, TILE_SIZE / 2);

    // Lives — bottom-left as small pac-man icons
    const lifeRadius = 6;
    const lifeY = CANVAS_HEIGHT - TILE_SIZE / 2;
    for (let i = 0; i < lives; i++) {
      const lx = 10 + i * (lifeRadius * 2 + 4);
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.moveTo(lx, lifeY);
      ctx.arc(lx, lifeY, lifeRadius, 0.3, Math.PI * 2 - 0.3);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawOverlay(phase: GameState['phase'], score?: number): void {
    if (!this.ctx) return;
    if (phase === 'PLAYING') return;

    const ctx = this.ctx;
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;

    // Semi-transparent black overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (phase === 'START') {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 36px monospace';
      ctx.fillText('PAC-MAN', cx, cy - 30);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('Press any key to start', cx, cy + 20);
    } else if (phase === 'PAUSED') {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 32px monospace';
      ctx.fillText('PAUSED', cx, cy);
    } else if (phase === 'GAME_OVER') {
      ctx.fillStyle = '#FF0000';
      ctx.font = 'bold 32px monospace';
      ctx.fillText('GAME OVER', cx, cy - 36);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '18px monospace';
      ctx.fillText(`Score: ${score ?? 0}`, cx, cy + 4);
      ctx.font = '14px monospace';
      ctx.fillText('Press R to restart', cx, cy + 32);
    }
  }

  drawScorePopups(popups: ScorePopup[]): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';

    for (const popup of popups) {
      const px = popup.tile.col * TILE_SIZE + TILE_SIZE / 2;
      const py = popup.tile.row * TILE_SIZE + TILE_SIZE / 2;
      ctx.fillText(String(popup.value), px, py);
    }
  }
}
