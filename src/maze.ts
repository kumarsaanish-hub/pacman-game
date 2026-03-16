import type { CellType, MazeGrid } from './types';

// Shorthand aliases for readability
const W: CellType = 'WALL';
const D: CellType = 'DOT';
const P: CellType = 'POWER_PELLET';
const E: CellType = 'EMPTY';
const T: CellType = 'TUNNEL';
const G: CellType = 'GHOST_HOUSE';

/**
 * Classic Pac-Man 28×31 maze layout.
 * Indexed as MAZE_LAYOUT[row][col].
 *
 * Row 14 (0-indexed) contains the tunnel cells at col 0 and col 27.
 * Ghost house occupies rows 13–15, cols 11–16 (interior = G, entrance = E).
 * Power pellets at: (row 3, col 1), (row 3, col 26), (row 23, col 1), (row 23, col 26).
 */
export const MAZE_LAYOUT: CellType[][] = [
  // Row 0
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  // Row 1
  [W,D,D,D,D,D,D,D,D,D,D,D,D,W,W,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 2
  [W,D,W,W,W,W,D,W,W,W,W,W,D,W,W,D,W,W,W,W,W,D,W,W,W,W,D,W],
  // Row 3
  [W,P,W,W,W,W,D,W,W,W,W,W,D,W,W,D,W,W,W,W,W,D,W,W,W,W,P,W],
  // Row 4
  [W,D,W,W,W,W,D,W,W,W,W,W,D,W,W,D,W,W,W,W,W,D,W,W,W,W,D,W],
  // Row 5
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 6
  [W,D,W,W,W,W,D,W,W,D,W,W,W,W,W,W,W,W,D,W,W,D,W,W,W,W,D,W],
  // Row 7
  [W,D,W,W,W,W,D,W,W,D,W,W,W,W,W,W,W,W,D,W,W,D,W,W,W,W,D,W],
  // Row 8
  [W,D,D,D,D,D,D,W,W,D,D,D,D,W,W,D,D,D,D,W,W,D,D,D,D,D,D,W],
  // Row 9
  [W,W,W,W,W,W,D,W,W,W,W,W,E,W,W,E,W,W,W,W,W,D,W,W,W,W,W,W],
  // Row 10
  [W,W,W,W,W,W,D,W,W,W,W,W,E,W,W,E,W,W,W,W,W,D,W,W,W,W,W,W],
  // Row 11
  [W,W,W,W,W,W,D,W,W,E,E,E,E,E,E,E,E,E,E,W,W,D,W,W,W,W,W,W],
  // Row 12
  [W,W,W,W,W,W,D,W,W,E,W,W,W,W,W,W,W,W,E,W,W,D,W,W,W,W,W,W],
  // Row 13
  [W,W,W,W,W,W,D,W,W,E,W,G,G,G,G,G,G,W,E,W,W,D,W,W,W,W,W,W],
  // Row 14 — tunnel row
  [T,E,E,E,E,E,E,W,W,E,W,G,G,G,G,G,G,W,E,W,W,E,E,E,E,E,E,T],
  // Row 15
  [W,W,W,W,W,W,D,W,W,E,W,G,G,G,G,G,G,W,E,W,W,D,W,W,W,W,W,W],
  // Row 16
  [W,W,W,W,W,W,D,W,W,E,W,W,W,W,W,W,W,W,E,W,W,D,W,W,W,W,W,W],
  // Row 17
  [W,W,W,W,W,W,D,W,W,E,E,E,E,E,E,E,E,E,E,W,W,D,W,W,W,W,W,W],
  // Row 18
  [W,W,W,W,W,W,D,W,W,E,W,W,W,W,W,W,W,W,E,W,W,D,W,W,W,W,W,W],
  // Row 19
  [W,W,W,W,W,W,D,W,W,W,W,W,E,W,W,E,W,W,W,W,W,D,W,W,W,W,W,W],
  // Row 20
  [W,W,W,W,W,W,D,W,W,W,W,W,E,W,W,E,W,W,W,W,W,D,W,W,W,W,W,W],
  // Row 21
  [W,D,D,D,D,D,D,D,D,D,D,D,D,W,W,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 22
  [W,D,W,W,W,W,D,W,W,W,W,W,D,W,W,D,W,W,W,W,W,D,W,W,W,W,D,W],
  // Row 23
  [W,P,W,W,W,W,D,W,W,W,W,W,D,W,W,D,W,W,W,W,W,D,W,W,W,W,P,W],
  // Row 24
  [W,D,D,D,W,W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W,W,D,D,D,W],
  // Row 25
  [W,W,W,D,W,W,D,W,W,D,W,W,W,W,W,W,W,W,D,W,W,D,W,W,D,W,W,W],
  // Row 26
  [W,W,W,D,W,W,D,W,W,D,W,W,W,W,W,W,W,W,D,W,W,D,W,W,D,W,W,W],
  // Row 27
  [W,D,D,D,D,D,D,W,W,D,D,D,D,W,W,D,D,D,D,W,W,D,D,D,D,D,D,W],
  // Row 28
  [W,D,W,W,W,W,W,W,W,W,W,W,D,W,W,D,W,W,W,W,W,W,W,W,W,W,D,W],
  // Row 29
  [W,D,W,W,W,W,W,W,W,W,W,W,D,W,W,D,W,W,W,W,W,W,W,W,W,W,D,W],
  // Row 30
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
];

/**
 * Returns a deep copy of the maze layout so each game instance
 * gets its own independent grid that can be mutated freely.
 */
export function createMaze(): MazeGrid {
  return MAZE_LAYOUT.map(row => [...row]);
}
