import { describe, it, expect } from 'vitest';
import { Game, createInitialState } from '../game';
import { CollisionDetector } from '../collision';
import type { GameState } from '../types';

// Full InputHandler stub implementing all methods
const stubInput = {
  getQueuedDirection: () => null,
  clearQueue: () => {},
  consumeAnyKey: () => false,
  consumeEscape: () => false,
  consumeRestart: () => false,
} as any;

function makeGame(): { game: Game; cd: CollisionDetector; state: GameState } {
  const state = createInitialState();
  state.phase = 'PLAYING';
  const game = new Game(state, stubInput);
  const cd = new CollisionDetector(game);
  game.setCollisionDetector(cd);
  return { game, cd, state };
}

describe('Integration: dot collection → level clear → level advance', () => {
  it('collecting the last dot increments the level', () => {
    const { cd, state, game } = makeGame();

    // Clear all dots/pellets from the maze
    for (let r = 0; r < state.maze.length; r++) {
      for (let c = 0; c < state.maze[r].length; c++) {
        if (state.maze[r][c] === 'DOT' || state.maze[r][c] === 'POWER_PELLET') {
          state.maze[r][c] = 'EMPTY';
        }
      }
    }

    // Place exactly one dot at Pac-Man's tile
    const pacRow = 5;
    const pacCol = 1;
    state.maze[pacRow][pacCol] = 'DOT';
    state.pacman.tile = { row: pacRow, col: pacCol };

    const levelBefore = state.level;
    cd.checkPacManDot(state);

    expect(game.getState().level).toBe(levelBefore + 1);
  });

  it('collecting the last dot resets the maze with dots restored', () => {
    const { cd, state, game } = makeGame();

    // Clear all dots/pellets
    for (let r = 0; r < state.maze.length; r++) {
      for (let c = 0; c < state.maze[r].length; c++) {
        if (state.maze[r][c] === 'DOT' || state.maze[r][c] === 'POWER_PELLET') {
          state.maze[r][c] = 'EMPTY';
        }
      }
    }

    // Place exactly one dot
    state.maze[5][1] = 'DOT';
    state.pacman.tile = { row: 5, col: 1 };

    cd.checkPacManDot(state);

    // After level advance, maze should have dots restored
    const newState = game.getState();
    const dotsInNewMaze = newState.maze.flat().filter(c => c === 'DOT' || c === 'POWER_PELLET').length;
    expect(dotsInNewMaze).toBeGreaterThan(0);
  });

  it('collecting the last dot resets Pac-Man to starting position', () => {
    const { cd, state, game } = makeGame();

    // Clear all dots/pellets
    for (let r = 0; r < state.maze.length; r++) {
      for (let c = 0; c < state.maze[r].length; c++) {
        if (state.maze[r][c] === 'DOT' || state.maze[r][c] === 'POWER_PELLET') {
          state.maze[r][c] = 'EMPTY';
        }
      }
    }

    // Move Pac-Man away from start and place last dot there
    state.maze[5][1] = 'DOT';
    state.pacman.tile = { row: 5, col: 1 };

    cd.checkPacManDot(state);

    // Pac-Man should be reset to starting tile (row 23, col 13)
    const newState = game.getState();
    expect(newState.pacman.tile).toEqual({ row: 23, col: 13 });
  });

  it('collecting the last dot resets dotsEaten to 0', () => {
    const { cd, state, game } = makeGame();

    // Clear all dots/pellets
    for (let r = 0; r < state.maze.length; r++) {
      for (let c = 0; c < state.maze[r].length; c++) {
        if (state.maze[r][c] === 'DOT' || state.maze[r][c] === 'POWER_PELLET') {
          state.maze[r][c] = 'EMPTY';
        }
      }
    }

    state.maze[5][1] = 'DOT';
    state.pacman.tile = { row: 5, col: 1 };
    state.dotsEaten = 239; // one short of full level

    cd.checkPacManDot(state);

    expect(game.getState().dotsEaten).toBe(0);
  });
});

describe('Integration: ghost collision → life loss → game over', () => {
  it('ghost collision with 1 life remaining sets phase to GAME_OVER', () => {
    const { cd, state } = makeGame();

    state.lives = 1;
    state.pacman.tile = { row: 5, col: 5 };
    state.ghosts[0].tile = { row: 5, col: 5 };
    state.ghosts[0].mode = 'CHASE';

    cd.checkPacManGhost(state);

    expect(state.phase).toBe('GAME_OVER');
  });

  it('ghost collision with 1 life remaining sets lives to 0', () => {
    const { cd, state } = makeGame();

    state.lives = 1;
    state.pacman.tile = { row: 5, col: 5 };
    state.ghosts[0].tile = { row: 5, col: 5 };
    state.ghosts[0].mode = 'CHASE';

    cd.checkPacManGhost(state);

    expect(state.lives).toBe(0);
  });

  it('ghost collision with 2 lives decrements to 1 and does not trigger GAME_OVER', () => {
    const { cd, state } = makeGame();

    state.lives = 2;
    state.pacman.tile = { row: 5, col: 5 };
    state.ghosts[0].tile = { row: 5, col: 5 };
    state.ghosts[0].mode = 'CHASE';

    const result = cd.checkPacManGhost(state);

    expect(result.type).toBe('normal');
    expect(state.lives).toBe(1);
    expect(state.phase).toBe('PLAYING');
  });

  it('game over result type is game_over when last life is lost', () => {
    const { cd, state } = makeGame();

    state.lives = 1;
    state.pacman.tile = { row: 5, col: 5 };
    state.ghosts[0].tile = { row: 5, col: 5 };
    state.ghosts[0].mode = 'CHASE';

    const result = cd.checkPacManGhost(state);

    expect(result.type).toBe('game_over');
  });

  it('game loop: tick does not advance state after GAME_OVER', () => {
    const { cd, state, game } = makeGame();

    state.lives = 1;
    state.pacman.tile = { row: 5, col: 5 };
    state.ghosts[0].tile = { row: 5, col: 5 };
    state.ghosts[0].mode = 'CHASE';

    cd.checkPacManGhost(state);
    expect(state.phase).toBe('GAME_OVER');

    // Score before ticking in GAME_OVER state
    const scoreBefore = state.score;
    game.tick(100);

    // Score should not change since game is over
    expect(game.getState().score).toBe(scoreBefore);
    expect(game.getState().phase).toBe('GAME_OVER');
  });
});
