import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Game, createInitialState, TILE_SIZE } from '../../game';
import { CollisionDetector } from '../../collision';
import type { GameState, GhostMode } from '../../types';
import { createMaze } from '../../maze';

// Minimal InputHandler stub
const stubInput = { getQueuedDirection: () => null, clearQueue: () => {} } as any;

function makeGameWithState(state: GameState): { game: Game; cd: CollisionDetector } {
  const game = new Game(state, stubInput);
  const cd = new CollisionDetector(game);
  game.setCollisionDetector(cd);
  return { game, cd };
}

// Arbitrary: a valid maze row/col that we can place a collectible on
const mazeRowArb = fc.integer({ min: 0, max: 30 });
const mazeColArb = fc.integer({ min: 0, max: 27 });

// Feature: pacman-game, Property 4: Collectible removal and score increment
describe('Property 4: Collectible removal and score increment', () => {
  it('collecting a DOT removes it and adds exactly 10 points', () => {
    // **Validates: Requirements 3.1, 3.2**
    fc.assert(
      fc.property(
        mazeRowArb,
        mazeColArb,
        fc.integer({ min: 0, max: 9999 }),
        (row, col, initialScore) => {
          const state = createInitialState();
          state.phase = 'PLAYING';
          state.score = initialScore;
          state.maze[row][col] = 'DOT';
          state.pacman.tile = { row, col };
          state.pacman.pixelPos = { x: col * TILE_SIZE, y: row * TILE_SIZE };

          const { cd } = makeGameWithState(state);
          cd.checkPacManDot(state);

          return state.maze[row][col] === 'EMPTY' && state.score === initialScore + 10;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('collecting a POWER_PELLET removes it and adds exactly 50 points', () => {
    // **Validates: Requirements 3.1, 3.2**
    fc.assert(
      fc.property(
        mazeRowArb,
        mazeColArb,
        fc.integer({ min: 0, max: 9999 }),
        (row, col, initialScore) => {
          const state = createInitialState();
          state.phase = 'PLAYING';
          state.score = initialScore;
          state.maze[row][col] = 'POWER_PELLET';
          state.pacman.tile = { row, col };
          state.pacman.pixelPos = { x: col * TILE_SIZE, y: row * TILE_SIZE };

          const { cd } = makeGameWithState(state);
          cd.checkPacManDot(state);

          return state.maze[row][col] === 'EMPTY' && state.score === initialScore + 50;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: pacman-game, Property 5: Power pellet triggers frightened mode on all ghosts
describe('Property 5: Power pellet triggers frightened mode on all ghosts', () => {
  it('all non-EATEN ghosts become FRIGHTENED after power pellet collection', () => {
    // **Validates: Requirements 3.3**
    const ghostModeArb = fc.constantFrom<GhostMode>('CHASE', 'SCATTER', 'HOUSE', 'FRIGHTENED', 'EATEN');

    fc.assert(
      fc.property(
        mazeRowArb,
        mazeColArb,
        fc.tuple(ghostModeArb, ghostModeArb, ghostModeArb, ghostModeArb),
        (row, col, ghostModes) => {
          const state = createInitialState();
          state.phase = 'PLAYING';
          state.maze[row][col] = 'POWER_PELLET';
          state.pacman.tile = { row, col };
          state.pacman.pixelPos = { x: col * TILE_SIZE, y: row * TILE_SIZE };

          // Assign random modes to ghosts
          ghostModes.forEach((mode, i) => {
            state.ghosts[i].mode = mode;
          });

          const { cd } = makeGameWithState(state);
          cd.checkPacManDot(state);

          // Every ghost that was not EATEN should now be FRIGHTENED
          return state.ghosts.every((ghost, i) => {
            if (ghostModes[i] === 'EATEN') {
              return ghost.mode === 'EATEN';
            }
            return ghost.mode === 'FRIGHTENED';
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('frightenedTimer is set to 7000ms after power pellet collection', () => {
    // **Validates: Requirements 3.3**
    fc.assert(
      fc.property(
        mazeRowArb,
        mazeColArb,
        fc.integer({ min: 0, max: 10000 }),
        (row, col, previousTimer) => {
          const state = createInitialState();
          state.phase = 'PLAYING';
          state.maze[row][col] = 'POWER_PELLET';
          state.pacman.tile = { row, col };
          state.pacman.pixelPos = { x: col * TILE_SIZE, y: row * TILE_SIZE };
          state.frightenedTimer = previousTimer;

          const { cd } = makeGameWithState(state);
          cd.checkPacManDot(state);

          return state.frightenedTimer === 7000;
        }
      ),
      { numRuns: 100 }
    );
  });
});
