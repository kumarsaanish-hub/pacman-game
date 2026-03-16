import type { GameState, GhostMode } from './types';
import type { Game } from './game';
import { getLevelConfig } from './levelConfig';
import { createInitialState } from './game';

/** Minimal audio interface — satisfied by AudioManager when available */
export interface AudioInterface {
  playChomp(): void;
  playPowerPellet(): void;
  playDeath(): void;
  playEatGhost(): void;
}

/** Result returned by checkPacManGhost */
export interface GhostCollisionResult {
  type: 'none' | 'normal' | 'frightened' | 'game_over';
  pointsAwarded?: number;
}

/** Ghost modes that are "dangerous" to Pac-Man */
const DANGEROUS_MODES: GhostMode[] = ['CHASE', 'SCATTER', 'HOUSE'];

export class CollisionDetector {
  private game: Game;
  private audio: AudioInterface | null = null;

  constructor(game: Game, audio?: AudioInterface) {
    this.game = game;
    this.audio = audio ?? null;
  }

  setAudio(audio: AudioInterface): void {
    this.audio = audio;
  }

  /** Check if Pac-Man is on a dot or power pellet tile and handle collection. */
  checkPacManDot(state: GameState): void {
    const { row, col } = state.pacman.tile;
    const cell = state.maze[row][col];

    if (cell === 'DOT') {
      state.maze[row][col] = 'EMPTY';
      state.score += 10;
      state.dotsEaten += 1;
      this.audio?.playChomp();
    } else if (cell === 'POWER_PELLET') {
      state.maze[row][col] = 'EMPTY';
      state.score += 50;
      state.dotsEaten += 1;
      this.audio?.playPowerPellet();

      // Set all non-EATEN ghosts to FRIGHTENED
      for (const ghost of state.ghosts) {
        if (ghost.mode !== 'EATEN') {
          ghost.mode = 'FRIGHTENED';
        }
      }
      state.frightenedTimer = getLevelConfig(state.level).frightenedDuration;
      state.ghostEatenCombo = 0;
    } else {
      return; // Nothing collected
    }

    // Check for level clear
    const hasRemaining = state.maze.some(row => row.some(cell => cell === 'DOT' || cell === 'POWER_PELLET'));
    if (!hasRemaining) {
      this.game.advanceLevel();
    }
  }

  /** Check Pac-Man vs ghost collision and handle consequences. */
  checkPacManGhost(state: GameState): GhostCollisionResult {
    const pacTile = state.pacman.tile;

    // Find a ghost on the same tile as Pac-Man (skip EATEN ghosts — they're invisible)
    const ghost = state.ghosts.find(
      g => g.tile.row === pacTile.row && g.tile.col === pacTile.col && g.mode !== 'EATEN'
    );

    if (!ghost) {
      return { type: 'none' };
    }

    if (ghost.mode === 'FRIGHTENED') {
      // ── Frightened ghost: eat it ──────────────────────────────────────────
      state.ghostEatenCombo += 1;
      const points = 200 * Math.pow(2, state.ghostEatenCombo - 1);
      state.score += points;
      ghost.mode = 'EATEN';

      // Create score popup at ghost's tile
      state.scorePopups.push({
        tile: { row: ghost.tile.row, col: ghost.tile.col },
        value: points,
        timeRemaining: 1000,
      });

      this.audio?.playEatGhost();

      return { type: 'frightened', pointsAwarded: points };
    }

    if (DANGEROUS_MODES.includes(ghost.mode)) {
      // ── Normal ghost: lose a life ─────────────────────────────────────────
      state.lives -= 1;
      this.audio?.playDeath();

      if (state.lives <= 0) {
        state.phase = 'GAME_OVER';
        return { type: 'game_over' };
      }

      // Reset Pac-Man and all ghosts to starting positions
      const initial = createInitialState();
      state.pacman = { ...initial.pacman };
      state.ghosts = initial.ghosts.map(g => ({ ...g }));
      state.frightenedTimer = 0;
      state.ghostEatenCombo = 0;

      return { type: 'normal' };
    }

    return { type: 'none' };
  }

  /** Check Pac-Man vs fruit collision and handle collection. */
  checkPacManFruit(state: GameState): void {
    if (state.fruit === null) return;

    if (
      state.pacman.tile.row === state.fruit.tile.row &&
      state.pacman.tile.col === state.fruit.tile.col
    ) {
      state.score += state.fruit.points;
      state.fruit = null;
    }
  }
}
