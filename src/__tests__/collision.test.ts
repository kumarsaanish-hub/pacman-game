import { describe, it, expect } from 'vitest';
import { Game, createInitialState } from '../game';
import { CollisionDetector } from '../collision';
import type { GameState } from '../types';

// Minimal InputHandler stub
const stubInput = { getQueuedDirection: () => null, clearQueue: () => {} } as any;

function makeGame(): { game: Game; cd: CollisionDetector; state: GameState } {
  const state = createInitialState();
  state.phase = 'PLAYING';
  const game = new Game(state, stubInput);
  const cd = new CollisionDetector(game);
  game.setCollisionDetector(cd);
  return { game, cd, state };
}

describe('CollisionDetector.checkPacManDot', () => {
  it('removes a DOT and adds 10 points', () => {
    const { cd, state } = makeGame();
    state.maze[5][1] = 'DOT';
    state.pacman.tile = { row: 5, col: 1 };
    const scoreBefore = state.score;

    cd.checkPacManDot(state);

    expect(state.maze[5][1]).toBe('EMPTY');
    expect(state.score).toBe(scoreBefore + 10);
    expect(state.dotsEaten).toBe(1);
  });

  it('removes a POWER_PELLET and adds 50 points', () => {
    const { cd, state } = makeGame();
    state.maze[3][1] = 'POWER_PELLET';
    state.pacman.tile = { row: 3, col: 1 };
    const scoreBefore = state.score;

    cd.checkPacManDot(state);

    expect(state.maze[3][1]).toBe('EMPTY');
    expect(state.score).toBe(scoreBefore + 50);
    expect(state.dotsEaten).toBe(1);
  });

  it('sets all non-EATEN ghosts to FRIGHTENED on power pellet', () => {
    const { cd, state } = makeGame();
    state.maze[3][1] = 'POWER_PELLET';
    state.pacman.tile = { row: 3, col: 1 };
    state.ghosts[0].mode = 'CHASE';
    state.ghosts[1].mode = 'SCATTER';
    state.ghosts[2].mode = 'HOUSE';
    state.ghosts[3].mode = 'EATEN'; // should stay EATEN

    cd.checkPacManDot(state);

    expect(state.ghosts[0].mode).toBe('FRIGHTENED');
    expect(state.ghosts[1].mode).toBe('FRIGHTENED');
    expect(state.ghosts[2].mode).toBe('FRIGHTENED');
    expect(state.ghosts[3].mode).toBe('EATEN'); // unchanged
  });

  it('sets frightenedTimer to 7000 on power pellet', () => {
    const { cd, state } = makeGame();
    state.maze[3][1] = 'POWER_PELLET';
    state.pacman.tile = { row: 3, col: 1 };

    cd.checkPacManDot(state);

    expect(state.frightenedTimer).toBe(7000);
  });

  it('resets ghostEatenCombo to 0 on power pellet', () => {
    const { cd, state } = makeGame();
    state.maze[3][1] = 'POWER_PELLET';
    state.pacman.tile = { row: 3, col: 1 };
    state.ghostEatenCombo = 3;

    cd.checkPacManDot(state);

    expect(state.ghostEatenCombo).toBe(0);
  });

  it('does nothing on EMPTY tile', () => {
    const { cd, state } = makeGame();
    state.maze[14][5] = 'EMPTY';
    state.pacman.tile = { row: 14, col: 5 };
    const scoreBefore = state.score;
    const dotsBefore = state.dotsEaten;

    cd.checkPacManDot(state);

    expect(state.score).toBe(scoreBefore);
    expect(state.dotsEaten).toBe(dotsBefore);
  });

  it('does nothing on WALL tile', () => {
    const { cd, state } = makeGame();
    state.maze[0][0] = 'WALL';
    state.pacman.tile = { row: 0, col: 0 };
    const scoreBefore = state.score;

    cd.checkPacManDot(state);

    expect(state.score).toBe(scoreBefore);
  });

  it('calls advanceLevel when last dot is collected', () => {
    const { cd, state, game } = makeGame();
    // Clear all dots/pellets from maze
    for (let r = 0; r < state.maze.length; r++) {
      for (let c = 0; c < state.maze[r].length; c++) {
        if (state.maze[r][c] === 'DOT' || state.maze[r][c] === 'POWER_PELLET') {
          state.maze[r][c] = 'EMPTY';
        }
      }
    }
    // Place exactly one dot at Pac-Man's position
    state.maze[5][1] = 'DOT';
    state.pacman.tile = { row: 5, col: 1 };
    const levelBefore = state.level;

    cd.checkPacManDot(state);

    // advanceLevel increments level
    expect(game.getState().level).toBe(levelBefore + 1);
  });

  it('does not advance level when dots remain', () => {
    const { cd, state, game } = makeGame();
    // Maze has many dots; just collect one
    state.pacman.tile = { row: 1, col: 1 }; // row 1 col 1 is a DOT in the default maze
    const levelBefore = state.level;

    cd.checkPacManDot(state);

    expect(game.getState().level).toBe(levelBefore);
  });
});

describe('CollisionDetector.checkPacManGhost', () => {
  it('returns none when no ghost shares Pac-Man tile', () => {
    const { cd, state } = makeGame();
    state.pacman.tile = { row: 5, col: 5 };
    state.ghosts.forEach(g => { g.tile = { row: 1, col: 1 }; });

    const result = cd.checkPacManGhost(state);

    expect(result.type).toBe('none');
  });

  it('decrements lives on normal ghost collision (CHASE)', () => {
    const { cd, state } = makeGame();
    state.lives = 3;
    state.pacman.tile = { row: 5, col: 5 };
    state.ghosts[0].tile = { row: 5, col: 5 };
    state.ghosts[0].mode = 'CHASE';

    const result = cd.checkPacManGhost(state);

    expect(result.type).toBe('normal');
    expect(state.lives).toBe(2);
  });

  it('decrements lives on normal ghost collision (SCATTER)', () => {
    const { cd, state } = makeGame();
    state.lives = 3;
    state.pacman.tile = { row: 5, col: 5 };
    state.ghosts[0].tile = { row: 5, col: 5 };
    state.ghosts[0].mode = 'SCATTER';

    const result = cd.checkPacManGhost(state);

    expect(result.type).toBe('normal');
    expect(state.lives).toBe(2);
  });

  it('decrements lives on normal ghost collision (HOUSE)', () => {
    const { cd, state } = makeGame();
    state.lives = 3;
    state.pacman.tile = { row: 5, col: 5 };
    state.ghosts[0].tile = { row: 5, col: 5 };
    state.ghosts[0].mode = 'HOUSE';

    const result = cd.checkPacManGhost(state);

    expect(result.type).toBe('normal');
    expect(state.lives).toBe(2);
  });

  it('resets Pac-Man and ghosts to starting positions after normal collision', () => {
    const { cd, state } = makeGame();
    state.lives = 3;
    state.pacman.tile = { row: 5, col: 5 };
    state.ghosts[0].tile = { row: 5, col: 5 };
    state.ghosts[0].mode = 'CHASE';

    cd.checkPacManGhost(state);

    // Pac-Man should be back at starting tile
    expect(state.pacman.tile).toEqual({ row: 23, col: 13 });
    // All ghosts should be back in HOUSE mode at starting positions
    expect(state.ghosts[0].mode).toBe('HOUSE');
    expect(state.ghosts[0].tile).toEqual({ row: 11, col: 13 }); // Blinky start
  });

  it('transitions to GAME_OVER when lives reach 0', () => {
    const { cd, state } = makeGame();
    state.lives = 1;
    state.pacman.tile = { row: 5, col: 5 };
    state.ghosts[0].tile = { row: 5, col: 5 };
    state.ghosts[0].mode = 'CHASE';

    const result = cd.checkPacManGhost(state);

    expect(result.type).toBe('game_over');
    expect(state.lives).toBe(0);
    expect(state.phase).toBe('GAME_OVER');
  });

  it('awards 200 points for first frightened ghost eaten', () => {
    const { cd, state } = makeGame();
    state.ghostEatenCombo = 0;
    state.score = 0;
    state.pacman.tile = { row: 5, col: 5 };
    state.ghosts[0].tile = { row: 5, col: 5 };
    state.ghosts[0].mode = 'FRIGHTENED';

    const result = cd.checkPacManGhost(state);

    expect(result.type).toBe('frightened');
    expect(result.pointsAwarded).toBe(200);
    expect(state.score).toBe(200);
    expect(state.ghostEatenCombo).toBe(1);
  });

  it('awards 400 points for second frightened ghost eaten', () => {
    const { cd, state } = makeGame();
    state.ghostEatenCombo = 1;
    state.score = 0;
    state.pacman.tile = { row: 5, col: 5 };
    state.ghosts[0].tile = { row: 5, col: 5 };
    state.ghosts[0].mode = 'FRIGHTENED';

    const result = cd.checkPacManGhost(state);

    expect(result.pointsAwarded).toBe(400);
    expect(state.score).toBe(400);
    expect(state.ghostEatenCombo).toBe(2);
  });

  it('sets eaten ghost mode to EATEN', () => {
    const { cd, state } = makeGame();
    state.pacman.tile = { row: 5, col: 5 };
    state.ghosts[0].tile = { row: 5, col: 5 };
    state.ghosts[0].mode = 'FRIGHTENED';

    cd.checkPacManGhost(state);

    expect(state.ghosts[0].mode).toBe('EATEN');
  });

  it('creates a ScorePopup at the ghost tile', () => {
    const { cd, state } = makeGame();
    state.ghostEatenCombo = 0;
    state.scorePopups = [];
    state.pacman.tile = { row: 5, col: 5 };
    state.ghosts[0].tile = { row: 5, col: 5 };
    state.ghosts[0].mode = 'FRIGHTENED';

    cd.checkPacManGhost(state);

    expect(state.scorePopups).toHaveLength(1);
    expect(state.scorePopups[0].tile).toEqual({ row: 5, col: 5 });
    expect(state.scorePopups[0].value).toBe(200);
    expect(state.scorePopups[0].timeRemaining).toBe(1000);
  });

  it('ignores EATEN ghosts on the same tile', () => {
    const { cd, state } = makeGame();
    state.lives = 3;
    state.pacman.tile = { row: 5, col: 5 };
    state.ghosts[0].tile = { row: 5, col: 5 };
    state.ghosts[0].mode = 'EATEN';

    const result = cd.checkPacManGhost(state);

    expect(result.type).toBe('none');
    expect(state.lives).toBe(3);
  });

  it('calls audio.playDeath on normal collision', () => {
    const state = createInitialState();
    state.phase = 'PLAYING';
    const game = new Game(state, stubInput);
    let deathCalled = false;
    const audio = { playChomp: () => {}, playPowerPellet: () => {}, playDeath: () => { deathCalled = true; }, playEatGhost: () => {} };
    const cd = new CollisionDetector(game, audio);
    game.setCollisionDetector(cd);

    state.lives = 2;
    state.pacman.tile = { row: 5, col: 5 };
    state.ghosts[0].tile = { row: 5, col: 5 };
    state.ghosts[0].mode = 'CHASE';

    cd.checkPacManGhost(state);

    expect(deathCalled).toBe(true);
  });

  it('calls audio.playEatGhost on frightened collision', () => {
    const state = createInitialState();
    state.phase = 'PLAYING';
    const game = new Game(state, stubInput);
    let eatCalled = false;
    const audio = { playChomp: () => {}, playPowerPellet: () => {}, playDeath: () => {}, playEatGhost: () => { eatCalled = true; } };
    const cd = new CollisionDetector(game, audio);
    game.setCollisionDetector(cd);

    state.pacman.tile = { row: 5, col: 5 };
    state.ghosts[0].tile = { row: 5, col: 5 };
    state.ghosts[0].mode = 'FRIGHTENED';

    cd.checkPacManGhost(state);

    expect(eatCalled).toBe(true);
  });
});
