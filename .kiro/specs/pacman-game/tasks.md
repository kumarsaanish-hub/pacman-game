# Implementation Plan: Pac-Man Game

## Overview

Implement a browser-based Pac-Man game in vanilla TypeScript using the HTML5 Canvas API. The architecture follows an MVC pattern with a `requestAnimationFrame` game loop. Tasks are ordered to build incrementally: data models → maze → movement → ghost AI → collision/scoring → game states → audio → fruit → integration.

## Tasks

- [x] 1. Project setup and core data types
  - Create `src/` directory with `index.html` entry point and `<canvas>` element
  - Define all TypeScript interfaces and types: `Direction`, `Tile`, `CellType`, `MazeGrid`, `PacManEntity`, `GhostEntity`, `FruitEntity`, `ScorePopup`, `GameState`, `GhostMode`, `LevelConfig`, `ChaseScatterCycle`
  - Set up Vitest and fast-check as dev dependencies
  - _Requirements: 1.1, 2.1, 4.1_

- [x] 2. Maze definition and initialization
  - [x] 2.1 Implement the static 28×31 maze layout as a `CellType[][]` constant
    - Encode walls, dots, power pellets, tunnels (row 14, cols 0 and 27), ghost house cells, and empty paths
    - Export a `createMaze(): MazeGrid` factory that returns a deep copy of the layout
    - _Requirements: 1.1, 1.3, 3.4_

  - [ ]* 2.2 Write unit tests for maze initialization
    - Verify tunnel cells at row 14 col 0 and col 27
    - Verify ghost house cells at expected positions
    - Verify dot and power pellet counts match expected totals
    - _Requirements: 1.1, 1.3_

- [x] 3. Renderer
  - [x] 3.1 Implement `Renderer` class with `render(state: GameState): void`
    - `drawMaze`: walls in blue, dots as small white circles, power pellets as larger white circles
    - `drawPacMan`: animated mouth open/close based on `mouthAngle`
    - `drawGhost`: colored body, eyes; blue/flashing when FRIGHTENED
    - `drawHUD`: score, lives, level number always visible
    - `drawOverlay`: START, PAUSED, GAME_OVER screens
    - `drawScorePopups`: brief point values at ghost-eaten positions
    - Handle null canvas context: show DOM error message and halt
    - _Requirements: 1.1, 1.2, 1.4, 2.5, 6.3, 8.1, 8.4, 8.5_

- [x] 4. Input handling
  - [x] 4.1 Implement `InputHandler` class
    - Map `ArrowUp/Down/Left/Right` → `Direction` enum values
    - Maintain a direction queue; expose `getQueuedDirection()` and `clearQueue()`
    - _Requirements: 2.1_

  - [ ]* 4.2 Write unit tests for InputHandler
    - Verify each arrow key maps to the correct `Direction`
    - _Requirements: 2.1_

- [x] 5. Pac-Man movement and tunnel wrapping
  - [x] 5.1 Implement Pac-Man movement logic in `Game.tick()`
    - Tile-boundary movement: apply `nextDirection` when passable, else continue current direction
    - Tunnel wrapping: when exiting tunnel cell, teleport to opposite entrance
    - Update `pixelPos` for smooth sub-tile animation
    - Update `mouthAngle` / `mouthOpening` each tick
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [ ]* 5.2 Write property test for passable direction causes movement (Property 2)
    - **Property 2: Passable direction causes movement**
    - **Validates: Requirements 2.2**

  - [ ]* 5.3 Write property test for blocked direction preserves current movement (Property 3)
    - **Property 3: Blocked direction preserves current movement**
    - **Validates: Requirements 2.3**

  - [ ]* 5.4 Write property test for tunnel wrapping symmetry (Property 1)
    - **Property 1: Tunnel wrapping is symmetric**
    - **Validates: Requirements 1.3, 2.4**

- [x] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Dot and power pellet collection
  - [x] 7.1 Implement `CollisionDetector.checkPacManDot()` and integrate into `Game.tick()`
    - Remove dot/power pellet from maze when Pac-Man occupies that tile
    - Add 10 points for dot, 50 for power pellet
    - On power pellet: set all ghosts to FRIGHTENED, set `frightenedTimer` from level config, reset `ghostEatenCombo` to 0
    - Increment `dotsEaten`; check for level clear (zero remaining dots/pellets)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 7.2 Write property test for collectible removal and score increment (Property 4)
    - **Property 4: Collectible removal and score increment**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 7.3 Write property test for power pellet triggers frightened mode (Property 5)
    - **Property 5: Power pellet triggers frightened mode on all ghosts**
    - **Validates: Requirements 3.3**

- [x] 8. Level configuration table
  - [x] 8.1 Implement `LEVEL_CONFIGS: LevelConfig[]` constant
    - Define speed, frightened duration/speed, and chase/scatter cycles for each level
    - Clamp access: if level exceeds array length, use last entry
    - _Requirements: 4.1, 7.2, 7.3_

  - [ ]* 8.2 Write property test for ghost speed matches level config (Property 6)
    - **Property 6: Ghost speed matches level configuration**
    - **Validates: Requirements 4.1**

  - [ ]* 8.3 Write property test for ghost speed monotonically non-decreasing (Property 14)
    - **Property 14: Ghost speed is monotonically non-decreasing across levels**
    - **Validates: Requirements 7.2**

  - [ ]* 8.4 Write property test for frightened duration non-increasing with floor (Property 15)
    - **Property 15: Frightened duration is monotonically non-increasing with a floor**
    - **Validates: Requirements 7.3**

- [x] 9. Ghost AI
  - [x] 9.1 Implement `GhostPersonality` strategy objects for Blinky, Pinky, Inky, Clyde
    - Blinky: chase target = Pac-Man's current tile
    - Pinky: chase target = 4 tiles ahead of Pac-Man's direction
    - Inky: chase target = double vector from Blinky to 2 tiles ahead of Pac-Man
    - Clyde: chase target = Pac-Man's tile if distance > 8, else scatter corner
    - Each personality encodes its `scatterCorner`
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 9.2 Write property test for ghost chase targets (Property 8)
    - **Property 8: Ghost chase targets are correct**
    - **Validates: Requirements 4.3, 4.4, 4.5, 4.6**

  - [ ]* 9.3 Write property test for scatter mode targets corners (Property 9)
    - **Property 9: Scatter mode targets designated corners**
    - **Validates: Requirements 4.7**

  - [x] 9.4 Implement `GhostAI.chooseNextTile()` pathfinding
    - In CHASE/SCATTER: choose adjacent non-wall tile minimizing distance to target; no reversals
    - In FRIGHTENED: choose a random valid adjacent tile
    - In EATEN: pathfind toward ghost house entrance
    - In HOUSE: hold until release timer elapses, then exit
    - _Requirements: 4.2, 4.7, 4.8, 4.9_

  - [x] 9.5 Implement chase/scatter mode timer in `Game.tick()`
    - Count down `modeTimer` through `chaseScatterCycles`; switch mode when timer expires
    - After all cycles exhausted, remain in CHASE permanently
    - Apply mode switch to all non-FRIGHTENED, non-EATEN ghosts
    - _Requirements: 4.2_

  - [ ]* 9.6 Write property test for chase/scatter alternates on timer (Property 7)
    - **Property 7: Chase/scatter mode alternates on timer**
    - **Validates: Requirements 4.2**

  - [ ]* 9.7 Write property test for frightened ghosts move at reduced speed (Property 10)
    - **Property 10: Frightened ghosts move at reduced speed**
    - **Validates: Requirements 4.8**

  - [ ]* 9.8 Write unit tests for ghost AI targeting and mode transitions
    - Test each personality's chase target formula with known positions
    - Test EATEN → HOUSE transition on reaching ghost house
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.9_

- [x] 10. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Collision detection — ghost interactions
  - [x] 11.1 Implement `CollisionDetector.checkPacManGhost()` and integrate into `Game.tick()`
    - Normal ghost collision: decrement lives, reset Pac-Man and all ghosts to starting positions, play death sound
    - Frightened ghost collision: increment `ghostEatenCombo`, award `200 × 2^(combo-1)` points, set ghost to EATEN, create `ScorePopup`, play eat-ghost sound
    - When lives reach 0: transition to GAME_OVER
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3_

  - [ ]* 11.2 Write property test for normal ghost collision decrements lives (Property 11)
    - **Property 11: Normal ghost collision decrements lives**
    - **Validates: Requirements 5.1**

  - [ ]* 11.3 Write property test for frightened ghost collision awards escalating points (Property 12)
    - **Property 12: Frightened ghost collision awards escalating points**
    - **Validates: Requirements 5.2, 6.1, 6.2**

  - [ ]* 11.4 Write unit tests for collision outcomes
    - Test GAME_OVER transition when lives reach 0
    - Test score popup creation at ghost tile
    - _Requirements: 5.3, 6.3_

- [x] 12. Level progression
  - [x] 12.1 Implement `Game.advanceLevel()`
    - Increment `level`, reset maze via `createMaze()`, reset `dotsEaten` to 0
    - Reset Pac-Man and all ghosts to starting tiles and directions
    - Apply new level's speed and frightened duration from `LEVEL_CONFIGS`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 12.2 Write property test for level advance resets maze and entities (Property 13)
    - **Property 13: Level advance resets maze and entities to starting state**
    - **Validates: Requirements 7.1, 7.4**

- [x] 13. Game state management
  - [x] 13.1 Implement `Game.start()`, `Game.pause()`, `Game.reset()` and wire to `InputHandler`
    - START → PLAYING on any keypress
    - PLAYING ↔ PAUSED on Escape
    - PAUSED state: game loop ticks but skips all simulation updates
    - GAME_OVER: display final score, offer restart
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 13.2 Write property test for pause toggle is an involution (Property 16)
    - **Property 16: Pause toggle is an involution**
    - **Validates: Requirements 8.3**

  - [ ]* 13.3 Write property test for paused state freezes entity positions (Property 17)
    - **Property 17: Paused state freezes all entity positions**
    - **Validates: Requirements 8.4**

  - [ ]* 13.4 Write unit tests for state transitions
    - START → PLAYING on keypress
    - PLAYING → GAME_OVER when lives reach 0
    - _Requirements: 8.2, 5.3_

- [x] 14. Audio
  - [x] 14.1 Implement `AudioManager` using the Web Audio API
    - `playChomp()`, `playPowerPellet()`, `playDeath()`, `playEatGhost()` using synthesized tones or buffers
    - Wrap all `AudioContext` operations in try/catch; set `enabled = false` on failure
    - All methods are no-ops when `enabled === false`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 14.2 Write property test for audio failure does not affect game state (Property 18)
    - **Property 18: Audio failure does not affect game state**
    - **Validates: Requirements 9.5**

  - [ ]* 14.3 Write unit tests for audio dispatch
    - Mock `AudioManager`; verify each game event calls the correct method
    - Verify graceful degradation when `AudioContext` is unavailable
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 15. Fruit bonus
  - [x] 15.1 Implement fruit spawning and despawn logic in `Game.tick()`
    - Spawn `FruitEntity` at maze center when `dotsEaten === 70` and `dotsEaten === 170`
    - Decrement `timeRemaining` each tick; remove fruit when `timeRemaining <= 0` (9000ms max)
    - _Requirements: 10.1, 10.2, 10.4_

  - [x] 15.2 Implement `CollisionDetector.checkPacManFruit()` and integrate into `Game.tick()`
    - When Pac-Man occupies fruit tile: remove fruit (set to null), add `fruit.points` to score
    - _Requirements: 10.3_

  - [ ]* 15.3 Write property test for fruit collection removes fruit and adds points (Property 19)
    - **Property 19: Fruit collection removes fruit and adds correct points**
    - **Validates: Requirements 10.3**

  - [ ]* 15.4 Write unit tests for fruit lifecycle
    - Verify fruit spawns at `dotsEaten === 70` and `dotsEaten === 170`
    - Verify fruit despawns when `timeRemaining <= 0`
    - _Requirements: 10.1, 10.2, 10.4_

- [x] 16. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Wire everything together
  - [x] 17.1 Instantiate all components in `main.ts` / `index.html` entry point
    - Create `GameState`, `Game`, `Renderer`, `InputHandler`, `GhostAI`, `CollisionDetector`, `AudioManager`
    - Start `requestAnimationFrame` loop; pass delta time to `Game.tick()`
    - Handle canvas unavailability: show DOM error and halt loop
    - _Requirements: 1.1, 8.1, 8.2_

  - [ ]* 17.2 Write integration tests for end-to-end flows
    - Test full game loop: dot collection → level clear → level advance
    - Test full game loop: ghost collision → life loss → game over
    - _Requirements: 3.4, 5.3, 7.1_

- [x] 18. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check with a minimum of 100 iterations each
- Unit tests use Vitest
- Test files live under `src/__tests__/` following the structure in the design document
