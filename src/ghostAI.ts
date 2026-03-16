import type { GhostEntity, GameState, Tile, MazeGrid, Direction, GhostMode, Difficulty } from './types';

// Ghost name type alias
type GhostName = GhostEntity['name'];

// ─── Constants ───────────────────────────────────────────────────────────────

const COLS = 28;
const ROWS = 31;

/** Ghost house entrance tile — EATEN ghosts pathfind here */
export const GHOST_HOUSE_ENTRANCE: Tile = { row: 11, col: 13 };

/** Release delays (ms) per ghost per difficulty */
const RELEASE_DELAYS_BY_DIFFICULTY: Record<Difficulty, Record<GhostName, number>> = {
  EASY:      { Blinky: 0, Pinky: 3000, Inky: 6000, Clyde: 9000 },
  MEDIUM:    { Blinky: 0, Pinky: 2000, Inky: 4000, Clyde: 6000 },
  HARD:      { Blinky: 0, Pinky: 1000, Inky: 2000, Clyde: 3000 },
  VERY_HARD: { Blinky: 0, Pinky:  500, Inky: 1000, Clyde: 1500 },
};

/** Direction deltas: [dRow, dCol] */
const DIR_DELTA: Record<Direction, [number, number]> = {
  UP:    [-1,  0],
  DOWN:  [ 1,  0],
  LEFT:  [ 0, -1],
  RIGHT: [ 0,  1],
  NONE:  [ 0,  0],
};

/** All cardinal directions (no NONE) */
const CARDINAL_DIRS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

/** Opposite direction map — used to prevent reversals */
const OPPOSITE: Record<Direction, Direction> = {
  UP:    'DOWN',
  DOWN:  'UP',
  LEFT:  'RIGHT',
  RIGHT: 'LEFT',
  NONE:  'NONE',
};

// ─── GhostPersonality interface ───────────────────────────────────────────────

export interface GhostPersonality {
  name: GhostName;
  color: string;
  scatterCorner: Tile;
  getChaseTarget(ghost: GhostEntity, state: GameState): Tile;
}

// ─── Personality implementations ─────────────────────────────────────────────

/** Blinky: directly targets Pac-Man's current tile */
const Blinky: GhostPersonality = {
  name: 'Blinky',
  color: '#FF0000',
  scatterCorner: { row: 0, col: 25 },
  getChaseTarget(_ghost: GhostEntity, state: GameState): Tile {
    return { ...state.pacman.tile };
  },
};

/** Pinky: targets 4 tiles ahead of Pac-Man's direction */
const Pinky: GhostPersonality = {
  name: 'Pinky',
  color: '#FFB8FF',
  scatterCorner: { row: 0, col: 2 },
  getChaseTarget(_ghost: GhostEntity, state: GameState): Tile {
    const pac = state.pacman;
    const [dr, dc] = DIR_DELTA[pac.direction === 'NONE' ? 'UP' : pac.direction];
    return { row: pac.tile.row + dr * 4, col: pac.tile.col + dc * 4 };
  },
};

/** Inky: targets tile computed by doubling vector from Blinky to 2 tiles ahead of Pac-Man */
const Inky: GhostPersonality = {
  name: 'Inky',
  color: '#00FFFF',
  scatterCorner: { row: 30, col: 25 },
  getChaseTarget(_ghost: GhostEntity, state: GameState): Tile {
    const pac = state.pacman;
    const blinky = state.ghosts.find(g => g.name === 'Blinky');
    const [dr, dc] = DIR_DELTA[pac.direction === 'NONE' ? 'UP' : pac.direction];
    // Pivot: 2 tiles ahead of Pac-Man
    const pivotRow = pac.tile.row + dr * 2;
    const pivotCol = pac.tile.col + dc * 2;
    if (!blinky) {
      return { row: pivotRow, col: pivotCol };
    }
    // Double the vector from Blinky to pivot
    return {
      row: pivotRow + (pivotRow - blinky.tile.row),
      col: pivotCol + (pivotCol - blinky.tile.col),
    };
  },
};

/** Clyde: targets Pac-Man when distance > 8, else own scatter corner */
const Clyde: GhostPersonality = {
  name: 'Clyde',
  color: '#FFB852',
  scatterCorner: { row: 30, col: 2 },
  getChaseTarget(ghost: GhostEntity, state: GameState): Tile {
    const pac = state.pacman;
    const dr = pac.tile.row - ghost.tile.row;
    const dc = pac.tile.col - ghost.tile.col;
    const dist = Math.sqrt(dr * dr + dc * dc);
    if (dist > 8) {
      return { ...pac.tile };
    }
    return { ...Clyde.scatterCorner };
  },
};

/** Map of all ghost personalities by name */
export const GHOST_PERSONALITIES: Record<GhostName, GhostPersonality> = {
  Blinky,
  Pinky,
  Inky,
  Clyde,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Euclidean distance squared between two tiles */
function distSq(a: Tile, b: Tile): number {
  const dr = a.row - b.row;
  const dc = a.col - b.col;
  return dr * dr + dc * dc;
}

/**
 * Returns true if the tile is passable for a ghost.
 * Ghosts can enter GHOST_HOUSE only when EATEN or HOUSE.
 */
function isGhostPassable(maze: MazeGrid, row: number, col: number, mode: GhostMode): boolean {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
  const cell = maze[row][col];
  if (cell === 'WALL') return false;
  if (cell === 'GHOST_HOUSE') {
    return mode === 'EATEN' || mode === 'HOUSE';
  }
  return true;
}

// ─── GhostAI class ────────────────────────────────────────────────────────────

export class GhostAI {
  /** Per-ghost release timer (ms elapsed since game start / level start) */
  private releaseTimers: Map<GhostName, number> = new Map();

  constructor() {
    // Initialize release timers to 0 (will count up via deltaMs)
    for (const name of ['Blinky', 'Pinky', 'Inky', 'Clyde'] as GhostName[]) {
      this.releaseTimers.set(name, 0);
    }
  }

  /** Reset release timers (call on level start / game reset) */
  resetTimers(): void {
    for (const name of ['Blinky', 'Pinky', 'Inky', 'Clyde'] as GhostName[]) {
      this.releaseTimers.set(name, 0);
    }
  }

  /** Main entry point — called each tick for each ghost */
  update(ghost: GhostEntity, state: GameState, deltaMs: number): void {
    // Advance release timer for HOUSE ghosts
    if (ghost.mode === 'HOUSE') {
      const elapsed = (this.releaseTimers.get(ghost.name) ?? 0) + deltaMs;
      this.releaseTimers.set(ghost.name, elapsed);

      const difficulty: Difficulty = state.difficulty ?? 'MEDIUM';
      const releaseDelay = RELEASE_DELAYS_BY_DIFFICULTY[difficulty][ghost.name];

      if (elapsed >= releaseDelay) {
        // Exit house — move to entrance and switch to SCATTER
        ghost.tile = { ...GHOST_HOUSE_ENTRANCE };
        ghost.pixelPos = {
          x: GHOST_HOUSE_ENTRANCE.col * 20,
          y: GHOST_HOUSE_ENTRANCE.row * 20,
        };
        ghost.mode = 'SCATTER';
        ghost.direction = 'LEFT';
      }
      return;
    }

    // Update frightenedFlashing
    if (ghost.mode === 'FRIGHTENED') {
      ghost.frightenedFlashing = state.frightenedTimer < 2000;
    } else {
      ghost.frightenedFlashing = false;
    }

    // At tile boundary, choose next tile (use threshold to handle float imprecision)
    const TILE_SIZE = 20;
    const atBoundary =
      Math.abs(ghost.pixelPos.x - ghost.tile.col * TILE_SIZE) < 0.5 &&
      Math.abs(ghost.pixelPos.y - ghost.tile.row * TILE_SIZE) < 0.5;

    if (atBoundary) {
      // Snap to exact tile boundary
      ghost.pixelPos = { x: ghost.tile.col * TILE_SIZE, y: ghost.tile.row * TILE_SIZE };
      const target = this._getTarget(ghost, state);
      const nextTile = this.chooseNextTile(ghost, target, state.maze, state.difficulty);

      if (nextTile.row !== ghost.tile.row || nextTile.col !== ghost.tile.col) {
        // Determine direction toward nextTile
        const dr = nextTile.row - ghost.tile.row;
        const dc = nextTile.col - ghost.tile.col;
        ghost.direction = this._deltaToDir(dr, dc);
      }
    }

    // Move ghost by speed
    const pixelsPerMs = (ghost.speed * TILE_SIZE) / 1000;
    const pixels = pixelsPerMs * deltaMs;

    // Move ghost in current direction
    if (ghost.direction !== 'NONE') {
      const [dr, dc] = DIR_DELTA[ghost.direction];
      const targetTile = {
        row: ghost.tile.row + dr,
        col: ghost.tile.col + dc,
      };

      // Safety check: if target tile is not passable, stop and reset direction
      if (!isGhostPassable(state.maze, targetTile.row, targetTile.col, ghost.mode)) {
        ghost.direction = 'NONE';
        ghost.pixelPos = { x: ghost.tile.col * TILE_SIZE, y: ghost.tile.row * TILE_SIZE };
        return;
      }

      const targetX = targetTile.col * TILE_SIZE;
      const targetY = targetTile.row * TILE_SIZE;

      const dx = targetX - ghost.pixelPos.x;
      const dy = targetY - ghost.pixelPos.y;
      const dist = Math.abs(dx) + Math.abs(dy);

      if (dist === 0) {
        ghost.tile = { ...targetTile };
        ghost.pixelPos = { x: targetX, y: targetY };
      } else {
        // Clamp step to never overshoot the target tile
        const step = Math.min(pixels, dist);
        ghost.pixelPos = {
          x: ghost.pixelPos.x + dc * step,
          y: ghost.pixelPos.y + dr * step,
        };
        if (ghost.pixelPos.x === targetX && ghost.pixelPos.y === targetY) {
          ghost.tile = { ...targetTile };
          // Clamp tile to valid bounds
          ghost.tile.row = Math.max(0, Math.min(ROWS - 1, ghost.tile.row));
          ghost.tile.col = Math.max(0, Math.min(COLS - 1, ghost.tile.col));
          ghost.pixelPos = { x: ghost.tile.col * TILE_SIZE, y: ghost.tile.row * TILE_SIZE };
          // Check if EATEN ghost reached house entrance
          if (
            ghost.mode === 'EATEN' &&
            ghost.tile.row === GHOST_HOUSE_ENTRANCE.row &&
            ghost.tile.col === GHOST_HOUSE_ENTRANCE.col
          ) {
            ghost.mode = 'HOUSE';
            this.releaseTimers.set(ghost.name, 0);
          }
        }
      }
    }
  }

  /** Returns the appropriate target tile for the ghost's current mode */
  getChaseTarget(ghost: GhostEntity, state: GameState): Tile {
    return GHOST_PERSONALITIES[ghost.name].getChaseTarget(ghost, state);
  }

  getScatterTarget(ghost: GhostEntity): Tile {
    return { ...GHOST_PERSONALITIES[ghost.name].scatterCorner };
  }

  /**
   * Choose the next tile for the ghost to move to.
   * - CHASE/SCATTER: minimize Euclidean distance to target; no reversals
   *   On HARD/VERY_HARD: use 2-tile look-ahead to avoid dead ends
   * - FRIGHTENED: random valid adjacent tile; no reversals
   * - EATEN: minimize distance to ghost house entrance; no reversals
   * - HOUSE: handled in update(); returns current tile
   */
  chooseNextTile(ghost: GhostEntity, target: Tile, maze: MazeGrid, difficulty: Difficulty = 'MEDIUM'): Tile {
    if (ghost.mode === 'HOUSE') {
      return { ...ghost.tile };
    }

    const forbidden = OPPOSITE[ghost.direction];
    const candidates: Tile[] = [];

    for (const dir of CARDINAL_DIRS) {
      if (dir === forbidden) continue;
      const [dr, dc] = DIR_DELTA[dir];
      const next = { row: ghost.tile.row + dr, col: ghost.tile.col + dc };
      if (isGhostPassable(maze, next.row, next.col, ghost.mode)) {
        candidates.push(next);
      }
    }

    if (candidates.length === 0) return { ...ghost.tile };

    if (ghost.mode === 'FRIGHTENED') {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // On HARD/VERY_HARD use 2-tile look-ahead: score each candidate by the
    // best distance achievable one step further, avoiding dead ends
    const useLookAhead = difficulty === 'HARD' || difficulty === 'VERY_HARD';

    if (useLookAhead) {
      let best = candidates[0];
      let bestScore = Infinity;

      for (const candidate of candidates) {
        // Find the best next-next tile from this candidate
        const fromDir = this._deltaToDir(candidate.row - ghost.tile.row, candidate.col - ghost.tile.col);
        const forbiddenFromCandidate = OPPOSITE[fromDir];
        let minDist = distSq(candidate, target);

        for (const dir2 of CARDINAL_DIRS) {
          if (dir2 === forbiddenFromCandidate) continue;
          const [dr2, dc2] = DIR_DELTA[dir2];
          const next2 = { row: candidate.row + dr2, col: candidate.col + dc2 };
          if (isGhostPassable(maze, next2.row, next2.col, ghost.mode)) {
            const d = distSq(next2, target);
            if (d < minDist) minDist = d;
          }
        }

        if (minDist < bestScore) {
          bestScore = minDist;
          best = candidate;
        }
      }
      return best;
    }

    // Standard: pick tile minimizing distance to target
    let best = candidates[0];
    let bestDist = distSq(candidates[0], target);
    for (let i = 1; i < candidates.length; i++) {
      const d = distSq(candidates[i], target);
      if (d < bestDist) {
        bestDist = d;
        best = candidates[i];
      }
    }
    return best;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private _getTarget(ghost: GhostEntity, state: GameState): Tile {
    switch (ghost.mode) {
      case 'CHASE':
        return this.getChaseTarget(ghost, state);
      case 'SCATTER':
        return this.getScatterTarget(ghost);
      case 'EATEN':
        return { ...GHOST_HOUSE_ENTRANCE };
      default:
        return { ...ghost.tile };
    }
  }

  private _deltaToDir(dr: number, dc: number): Direction {
    if (dr === -1) return 'UP';
    if (dr === 1)  return 'DOWN';
    if (dc === -1) return 'LEFT';
    if (dc === 1)  return 'RIGHT';
    return 'NONE';
  }
}
