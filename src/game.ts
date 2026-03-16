import type { GameState, Direction, Tile, GhostEntity, Difficulty } from './types';
import { createMaze } from './maze';
import type { InputHandler } from './input';
import type { CollisionDetector } from './collision';
import { GhostAI } from './ghostAI';
import { getLevelConfig } from './levelConfig';

export const TILE_SIZE = 20; // pixels per tile
const COLS = 28;
const ROWS = 31;

// Tunnel wrapping: row 14, col 0 ↔ col 27
const TUNNEL_ROW = 14;
const TUNNEL_LEFT_COL = 0;
const TUNNEL_RIGHT_COL = 27;

// Mouth animation speed: 180 degrees/sec → full 0→45→0 cycle in ~0.25s
const MOUTH_SPEED_DEG_PER_SEC = 180;

/** Direction deltas: [dRow, dCol] */
const DIR_DELTA: Record<Direction, [number, number]> = {
  UP:    [-1,  0],
  DOWN:  [ 1,  0],
  LEFT:  [ 0, -1],
  RIGHT: [ 0,  1],
  NONE:  [ 0,  0],
};

/** Returns true if the tile at (row, col) is passable for Pac-Man */
function isPassable(maze: GameState['maze'], row: number, col: number): boolean {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
  const cell = maze[row][col];
  return cell !== 'WALL' && cell !== 'GHOST_HOUSE';
}

/** Returns the neighbour tile in the given direction, without wrapping */
function neighbourTile(tile: Tile, dir: Direction): Tile {
  const [dr, dc] = DIR_DELTA[dir];
  return { row: tile.row + dr, col: tile.col + dc };
}

/** Check whether pixelPos is aligned to a tile boundary */
function isAtTileBoundary(pixelPos: { x: number; y: number }, tile: Tile): boolean {
  return pixelPos.x === tile.col * TILE_SIZE && pixelPos.y === tile.row * TILE_SIZE;
}

const DIFFICULTY_MULTIPLIERS: Record<Difficulty, { speed: number; frightened: number }> = {
  EASY:      { speed: 0.7,  frightened: 1.5 },
  MEDIUM:    { speed: 1.0,  frightened: 1.0 },
  HARD:      { speed: 1.4,  frightened: 0.5 },
  VERY_HARD: { speed: 1.9,  frightened: 0.1 },
};

export function createInitialState(difficulty: Difficulty = 'MEDIUM'): GameState {
  const maze = createMaze();

  const ghosts: GhostEntity[] = [
    {
      name: 'Blinky',
      tile: { row: 11, col: 13 },
      pixelPos: { x: 13 * TILE_SIZE, y: 11 * TILE_SIZE },
      direction: 'NONE',
      mode: 'HOUSE',
      speed: 7.5,
      frightenedFlashing: false,
    },
    {
      name: 'Pinky',
      tile: { row: 13, col: 13 },
      pixelPos: { x: 13 * TILE_SIZE, y: 13 * TILE_SIZE },
      direction: 'NONE',
      mode: 'HOUSE',
      speed: 7.5,
      frightenedFlashing: false,
    },
    {
      name: 'Inky',
      tile: { row: 13, col: 11 },
      pixelPos: { x: 11 * TILE_SIZE, y: 13 * TILE_SIZE },
      direction: 'NONE',
      mode: 'HOUSE',
      speed: 7.5,
      frightenedFlashing: false,
    },
    {
      name: 'Clyde',
      tile: { row: 13, col: 15 },
      pixelPos: { x: 15 * TILE_SIZE, y: 13 * TILE_SIZE },
      direction: 'NONE',
      mode: 'HOUSE',
      speed: 7.5,
      frightenedFlashing: false,
    },
  ];

  return {
    phase: 'START',
    difficulty,
    level: 1,
    score: 0,
    lives: 3,
    maze,
    pacman: {
      tile: { row: 23, col: 13 },
      pixelPos: { x: 13 * TILE_SIZE, y: 23 * TILE_SIZE },
      direction: 'NONE',
      nextDirection: 'NONE',
      mouthAngle: 0,
      mouthOpening: true,
      speed: 7.5,
    },
    ghosts,
    fruit: null,
    dotsEaten: 0,
    frightenedTimer: 0,
    ghostEatenCombo: 0,
    scorePopups: [],
  };
}

export class Game {
  private state: GameState;
  private input: InputHandler;
  private collisionDetector: CollisionDetector | null = null;
  private ghostAI: GhostAI = new GhostAI();

  // Chase/scatter cycle tracking (not in GameState interface)
  private modeTimer: number = 0;
  private modeTimerCycleIndex: number = 0;
  private modeIsChase: boolean = false; // false = scatter, true = chase

  // Tracks which dotsEaten thresholds have already triggered a fruit spawn this level
  private _fruitSpawnedAt: Set<number> = new Set();

  constructor(state: GameState, input: InputHandler) {
    this.state = state;
    this.input = input;
    // Initialize mode timer to first scatter phase
    const config = getLevelConfig(state.level);
    const mult = DIFFICULTY_MULTIPLIERS[state.difficulty];
    const cycles = config.chaseScatterCycles;
    this.modeTimer = cycles.length > 0 ? cycles[0].scatterDuration : 0;
    // Apply difficulty to initial ghost speeds
    for (const ghost of this.state.ghosts) {
      ghost.speed = config.ghostSpeed * mult.speed;
    }
    this.state.pacman.speed = 7.5;
  }

  setCollisionDetector(cd: CollisionDetector): void {
    this.collisionDetector = cd;
  }

  getCollisionDetector(): CollisionDetector | null {
    return this.collisionDetector;
  }

  getState(): GameState {
    return this.state;
  }

  /** Transition START → PLAYING */
  start(): void {
    if (this.state.phase === 'START') {
      this.state.phase = 'PLAYING';
    }
  }

  /** Toggle PLAYING ↔ PAUSED */
  pause(): void {
    if (this.state.phase === 'PLAYING') {
      this.state.phase = 'PAUSED';
    } else if (this.state.phase === 'PAUSED') {
      this.state.phase = 'PLAYING';
    }
  }

  /** Full reset to initial START state */
  reset(): void {
    this.state = createInitialState(this.state.difficulty);
    this.ghostAI.resetTimers();
    this._resetModeTimer();
    this._fruitSpawnedAt = new Set();
  }

  /** Increment level, reset maze and entities */
  advanceLevel(): void {
    this.state.level += 1;
    this.state.maze = createMaze();
    this.state.dotsEaten = 0;

    // Reset Pac-Man and ghosts to starting positions/directions
    const initial = createInitialState(this.state.difficulty);
    this.state.pacman = { ...initial.pacman };
    this.state.ghosts = initial.ghosts.map(g => ({ ...g }));

    // Apply new level's speed configuration with difficulty multiplier
    const config = getLevelConfig(this.state.level);
    const mult = DIFFICULTY_MULTIPLIERS[this.state.difficulty];
    for (const ghost of this.state.ghosts) {
      ghost.speed = config.ghostSpeed * mult.speed;
    }

    this.state.fruit = null;
    this.state.frightenedTimer = 0;
    this.state.ghostEatenCombo = 0;
    this.state.scorePopups = [];
    this.ghostAI.resetTimers();
    this._resetModeTimer();
    this._fruitSpawnedAt = new Set();
  }

  /** One simulation step. deltaMs = elapsed milliseconds since last tick. */
  tick(deltaMs: number): void {
    // Process input-driven state transitions before the PLAYING guard
    const phase = this.state.phase;
    if (phase === 'START' && this.input.consumeAnyKey()) {
      this.start();
    } else if (phase === 'PLAYING' && this.input.consumeEscape()) {
      this.pause();
    } else if (phase === 'PAUSED' && this.input.consumeEscape()) {
      this.pause();
    } else if (phase === 'GAME_OVER' && this.input.consumeRestart()) {
      this.reset();
      this.start();
    }

    if (this.state.phase !== 'PLAYING') return;

    this._updatePacMan(deltaMs);
    this.collisionDetector?.checkPacManDot(this.state);

    // Fruit spawning: spawn at 70 and 170 dots eaten (once per threshold per level)
    const FRUIT_THRESHOLDS = [70, 170];
    for (const threshold of FRUIT_THRESHOLDS) {
      if (
        this.state.dotsEaten === threshold &&
        this.state.fruit === null &&
        !this._fruitSpawnedAt.has(threshold)
      ) {
        this._fruitSpawnedAt.add(threshold);
        const fruit = this._pickFruit();
        this.state.fruit = {
          tile: { row: 17, col: 13 },
          points: fruit.points,
          emoji: fruit.emoji,
          timeRemaining: 9000,
        };
      }
    }

    // Fruit despawn: decrement timer and remove when expired
    if (this.state.fruit !== null) {
      this.state.fruit.timeRemaining -= deltaMs;
      if (this.state.fruit.timeRemaining <= 0) {
        this.state.fruit = null;
      }
    }

    this.collisionDetector?.checkPacManFruit(this.state);
    this.collisionDetector?.checkPacManGhost(this.state);

    // If ghost collision caused GAME_OVER, stop processing
    if (this.state.phase !== 'PLAYING') return;

    // Update ghost AI for each ghost
    for (const ghost of this.state.ghosts) {
      this.ghostAI.update(ghost, this.state, deltaMs);
    }

    // Decrement frightened timer and handle expiry
    if (this.state.frightenedTimer > 0) {
      this.state.frightenedTimer = Math.max(0, this.state.frightenedTimer - deltaMs);
      if (this.state.frightenedTimer === 0) {
        // Return all FRIGHTENED ghosts to SCATTER
        for (const ghost of this.state.ghosts) {
          if (ghost.mode === 'FRIGHTENED') {
            ghost.mode = 'SCATTER';
            ghost.frightenedFlashing = false;
          }
        }
      }
    }

    // Chase/scatter cycle timer (only when not all ghosts are in special modes)
    this._updateChaseScatterTimer(deltaMs);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private _updatePacMan(deltaMs: number): void {
    const pac = this.state.pacman;
    const maze = this.state.maze;

    // Consume queued input into nextDirection
    const queued = this.input.getQueuedDirection();
    if (queued !== null) {
      pac.nextDirection = queued;
      this.input.clearQueue();
    }

    // Move Pac-Man by speed (pixels per ms)
    const pixelsPerMs = (pac.speed * TILE_SIZE) / 1000;
    let remaining = pixelsPerMs * deltaMs;

    while (remaining > 0) {
      if (isAtTileBoundary(pac.pixelPos, pac.tile)) {
        // ── At a tile boundary: decide direction ──────────────────────────────

        // Try to apply nextDirection
        if (pac.nextDirection !== 'NONE') {
          const nextTile = neighbourTile(pac.tile, pac.nextDirection);
          if (isPassable(maze, nextTile.row, nextTile.col)) {
            pac.direction = pac.nextDirection;
          }
        }

        // If current direction is blocked (or NONE), stop
        if (pac.direction === 'NONE') break;

        const ahead = neighbourTile(pac.tile, pac.direction);
        if (!isPassable(maze, ahead.row, ahead.col)) {
          // Blocked — stop moving
          break;
        }
      }

      if (pac.direction === 'NONE') break;

      // ── Move one pixel step toward the next tile ──────────────────────────
      const [dr, dc] = DIR_DELTA[pac.direction];
      const targetTile = neighbourTile(pac.tile, pac.direction);
      const targetX = targetTile.col * TILE_SIZE;
      const targetY = targetTile.row * TILE_SIZE;

      const dx = targetX - pac.pixelPos.x;
      const dy = targetY - pac.pixelPos.y;
      const dist = Math.abs(dx) + Math.abs(dy); // Manhattan (only one axis moves)

      if (dist === 0) {
        // Already at target pixel — update tile and handle tunnel wrap
        pac.tile = { ...targetTile };
        pac.tile = this._applyTunnelWrap(pac.tile);
        pac.pixelPos = { x: pac.tile.col * TILE_SIZE, y: pac.tile.row * TILE_SIZE };
        break;
      }

      const step = Math.min(remaining, dist);
      pac.pixelPos = {
        x: pac.pixelPos.x + dc * step,
        y: pac.pixelPos.y + dr * step,
      };
      remaining -= step;

      // If we've reached the target pixel, update tile
      if (pac.pixelPos.x === targetX && pac.pixelPos.y === targetY) {
        pac.tile = { ...targetTile };
        pac.tile = this._applyTunnelWrap(pac.tile);
        pac.pixelPos = { x: pac.tile.col * TILE_SIZE, y: pac.tile.row * TILE_SIZE };
      }
    }

    // ── Mouth animation ───────────────────────────────────────────────────────
    this._updateMouth(pac, deltaMs);
  }

  /** Apply tunnel wrapping when Pac-Man exits a tunnel cell */
  private _applyTunnelWrap(tile: Tile): Tile {
    if (tile.row !== TUNNEL_ROW) return tile;

    if (tile.col < TUNNEL_LEFT_COL) {
      // Exited left → teleport to right entrance
      return { row: TUNNEL_ROW, col: TUNNEL_RIGHT_COL };
    }
    if (tile.col > TUNNEL_RIGHT_COL) {
      // Exited right → teleport to left entrance
      return { row: TUNNEL_ROW, col: TUNNEL_LEFT_COL };
    }
    return tile;
  }

  /** Oscillate mouthAngle between 0 and 45 degrees */
  private _updateMouth(pac: GameState['pacman'], deltaMs: number): void {
    const delta = (MOUTH_SPEED_DEG_PER_SEC * deltaMs) / 1000;

    if (pac.mouthOpening) {
      pac.mouthAngle += delta;
      if (pac.mouthAngle >= 45) {
        pac.mouthAngle = 45;
        pac.mouthOpening = false;
      }
    } else {
      pac.mouthAngle -= delta;
      if (pac.mouthAngle <= 0) {
        pac.mouthAngle = 0;
        pac.mouthOpening = true;
      }
    }
  }

  /** Initialize mode timer to the first scatter phase */
  private _resetModeTimer(): void {
    this.modeTimerCycleIndex = 0;
    this.modeIsChase = false;
    const config = getLevelConfig(this.state.level);
    const cycles = config.chaseScatterCycles;
    this.modeTimer = cycles.length > 0 ? cycles[0].scatterDuration : 0;
  }

  /**
   * Advance the chase/scatter cycle timer.
   * Applies mode switches to all non-FRIGHTENED, non-EATEN, non-HOUSE ghosts.
   */
  private _updateChaseScatterTimer(deltaMs: number): void {
    const config = getLevelConfig(this.state.level);
    const cycles = config.chaseScatterCycles;

    // If we've exhausted all cycles, stay in CHASE permanently
    if (this.modeTimerCycleIndex >= cycles.length) return;

    this.modeTimer -= deltaMs;
    if (this.modeTimer > 0) return;

    // Timer expired — switch mode
    if (!this.modeIsChase) {
      // Was scatter → switch to chase
      this.modeIsChase = true;
      const chaseDuration = cycles[this.modeTimerCycleIndex].chaseDuration;
      if (chaseDuration === Infinity) {
        // Permanent chase — exhaust cycles
        this.modeTimerCycleIndex = cycles.length;
        this.modeTimer = 0;
      } else {
        this.modeTimer = chaseDuration;
      }
      this._applyModeSwitch('CHASE');
    } else {
      // Was chase → advance to next cycle's scatter
      this.modeTimerCycleIndex += 1;
      if (this.modeTimerCycleIndex >= cycles.length) {
        // No more cycles — permanent chase
        this.modeTimer = 0;
        this._applyModeSwitch('CHASE');
        return;
      }
      this.modeIsChase = false;
      this.modeTimer = cycles[this.modeTimerCycleIndex].scatterDuration;
      this._applyModeSwitch('SCATTER');
    }
  }

  /** Apply a CHASE or SCATTER mode switch to eligible ghosts */
  private _applyModeSwitch(newMode: 'CHASE' | 'SCATTER'): void {
    for (const ghost of this.state.ghosts) {
      if (
        ghost.mode !== 'FRIGHTENED' &&
        ghost.mode !== 'EATEN' &&
        ghost.mode !== 'HOUSE'
      ) {
        ghost.mode = newMode;
      }
    }
  }

  /** Picks a random fruit based on rarity weights. */
  private _pickFruit(): { points: number; emoji: string } {
    const roll = Math.random();
    if (roll < 0.60) return { points: 100, emoji: '🍒' }; // cherry — common
    if (roll < 0.80) return { points: 200, emoji: '🍊' }; // orange — rare
    if (roll < 0.93) return { points: 500, emoji: '🍋' }; // lemon  — very rare
    return { points: 800, emoji: '🍈' };                   // lime   — ultra rare
  }

}
