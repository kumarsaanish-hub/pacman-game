// Core data types for the Pac-Man game

/** Movement direction for Pac-Man and ghosts */
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE';

/** A position in the tile grid */
export interface Tile {
  col: number;
  row: number;
}

/** The type of content in a maze cell */
export type CellType = 'WALL' | 'DOT' | 'POWER_PELLET' | 'EMPTY' | 'TUNNEL' | 'GHOST_HOUSE';

/** The maze grid: a 2D array indexed [row][col] */
export type MazeGrid = CellType[][];

/** Pac-Man entity state */
export interface PacManEntity {
  tile: Tile;
  pixelPos: { x: number; y: number };
  direction: Direction;
  nextDirection: Direction;
  mouthAngle: number;       // 0–45 degrees
  mouthOpening: boolean;    // true = opening, false = closing
  speed: number;            // tiles per second
}

/** Ghost operating mode */
export type GhostMode = 'CHASE' | 'SCATTER' | 'FRIGHTENED' | 'EATEN' | 'HOUSE';

/** Ghost entity state */
export interface GhostEntity {
  name: 'Blinky' | 'Pinky' | 'Inky' | 'Clyde';
  tile: Tile;
  pixelPos: { x: number; y: number };
  direction: Direction;
  mode: GhostMode;
  speed: number;                // tiles per second (reduced in FRIGHTENED)
  frightenedFlashing: boolean;  // true when frightened timer < 2s
}

/** Bonus fruit entity */
export interface FruitEntity {
  tile: Tile;
  points: number;         // varies by type
  timeRemaining: number;  // ms until despawn (9000ms max)
  emoji: string;          // visual representation
}

/** Floating score popup shown when a ghost is eaten */
export interface ScorePopup {
  tile: Tile;
  value: number;
  timeRemaining: number;  // ms to display (typically 1000ms)
}

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD';

/** Overall game state — the single source of truth */
export interface GameState {
  phase: 'START' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
  difficulty: Difficulty;
  level: number;
  score: number;
  lives: number;
  maze: MazeGrid;
  pacman: PacManEntity;
  ghosts: GhostEntity[];
  fruit: FruitEntity | null;
  dotsEaten: number;
  frightenedTimer: number;    // ms remaining in frightened mode
  ghostEatenCombo: number;    // ghosts eaten in current frightened activation
  scorePopups: ScorePopup[];
}

/** One phase of the chase/scatter cycle */
export interface ChaseScatterCycle {
  scatterDuration: number;  // ms
  chaseDuration: number;    // ms
}

/** Per-level configuration for speeds and timings */
export interface LevelConfig {
  ghostSpeed: number;                       // tiles/sec base speed
  frightenedDuration: number;               // ms (min 1000)
  frightenedSpeed: number;                  // tiles/sec during frightened
  chaseScatterCycles: ChaseScatterCycle[];
}
