# Requirements Document

## Introduction

A browser-based Pac-Man game implementation that replicates the classic arcade experience. The player controls Pac-Man through a maze, eating dots and power pellets while avoiding four ghosts. The game includes scoring, lives, level progression, and ghost AI behavior faithful to the original game.

## Glossary

- **Game**: The Pac-Man application managing overall game state and lifecycle
- **Pac-Man**: The player-controlled character that moves through the maze
- **Ghost**: One of four enemy characters (Blinky, Pinky, Inky, Clyde) that pursue Pac-Man
- **Maze**: The grid-based playing field containing walls, dots, power pellets, and tunnels
- **Dot**: A small collectible item worth 10 points placed throughout the maze
- **Power_Pellet**: A large collectible item worth 50 points that temporarily makes ghosts vulnerable
- **Frightened_Mode**: The state in which ghosts become vulnerable and can be eaten by Pac-Man
- **Score**: The running total of points accumulated by the player
- **Life**: A single attempt; the player starts with 3 lives
- **Level**: A completed maze cycle; clearing all dots advances to the next level
- **Renderer**: The component responsible for drawing the game state to the canvas
- **Input_Handler**: The component that captures and processes keyboard input
- **Ghost_AI**: The component that controls ghost movement and behavior

## Requirements

### Requirement 1: Maze Rendering

**User Story:** As a player, I want to see a classic Pac-Man maze, so that I have a familiar playing field.

#### Acceptance Criteria

1. THE Renderer SHALL display a maze composed of walls, dots, power pellets, and open paths on an HTML canvas element
2. THE Renderer SHALL render walls in blue, dots as small white circles, and power pellets as larger white circles
3. THE Maze SHALL include a tunnel on the left and right edges that wraps Pac-Man and ghosts to the opposite side
4. THE Renderer SHALL display the current Score, remaining lives, and current level number on screen at all times

---

### Requirement 2: Pac-Man Movement

**User Story:** As a player, I want to control Pac-Man with arrow keys, so that I can navigate the maze.

#### Acceptance Criteria

1. WHEN the player presses an arrow key, THE Input_Handler SHALL queue the requested direction for Pac-Man
2. WHEN a queued direction is passable (no wall), THE Game SHALL move Pac-Man in that direction at the start of the next tile boundary
3. WHILE a direction is blocked by a wall, THE Game SHALL continue moving Pac-Man in the last valid direction
4. WHEN Pac-Man reaches a tunnel edge, THE Game SHALL teleport Pac-Man to the opposite tunnel entrance
5. THE Renderer SHALL animate Pac-Man's mouth opening and closing while Pac-Man is moving

---

### Requirement 3: Dot and Power Pellet Collection

**User Story:** As a player, I want to collect dots and power pellets, so that I can score points and gain temporary power.

#### Acceptance Criteria

1. WHEN Pac-Man occupies a tile containing a dot, THE Game SHALL remove the dot and add 10 points to the Score
2. WHEN Pac-Man occupies a tile containing a power pellet, THE Game SHALL remove the power pellet and add 50 points to the Score
3. WHEN Pac-Man collects a power pellet, THE Game SHALL set all ghosts to Frightened_Mode for 7 seconds
4. WHEN all dots and power pellets in the maze are collected, THE Game SHALL advance to the next level

---

### Requirement 4: Ghost Behavior

**User Story:** As a player, I want ghosts to pursue me with distinct behaviors, so that the game is challenging and varied.

#### Acceptance Criteria

1. THE Ghost_AI SHALL move each ghost at a speed appropriate to the current level
2. WHEN the game is in normal mode, THE Ghost_AI SHALL alternate each ghost between Chase mode and Scatter mode on a fixed timer
3. WHEN in Chase mode, Blinky (red ghost) SHALL target Pac-Man's current tile directly
4. WHEN in Chase mode, Pinky (pink ghost) SHALL target the tile 4 cells ahead of Pac-Man's current direction
5. WHEN in Chase mode, Inky (cyan ghost) SHALL target a tile calculated using Blinky's position and Pac-Man's position
6. WHEN in Chase mode, Clyde (orange ghost) SHALL target Pac-Man's tile when more than 8 tiles away, and target the bottom-left scatter corner when within 8 tiles
7. WHEN in Scatter mode, THE Ghost_AI SHALL direct each ghost toward its designated corner of the maze
8. WHEN a ghost enters Frightened_Mode, THE Ghost_AI SHALL move the ghost in a random direction at reduced speed
9. WHEN a ghost is eaten in Frightened_Mode, THE Ghost_AI SHALL return the ghost to the ghost house and resume normal behavior after re-entry

---

### Requirement 5: Collision Detection

**User Story:** As a player, I want collisions with ghosts to have consequences, so that the game has meaningful stakes.

#### Acceptance Criteria

1. WHEN Pac-Man occupies the same tile as a ghost not in Frightened_Mode, THE Game SHALL decrement the life count by 1 and reset Pac-Man and all ghosts to their starting positions
2. WHEN Pac-Man occupies the same tile as a ghost in Frightened_Mode, THE Game SHALL remove that ghost from the maze, add points to the Score (200 for first ghost, doubling for each subsequent ghost within the same power pellet), and send the ghost back to the ghost house
3. WHEN the life count reaches 0, THE Game SHALL transition to the Game Over state

---

### Requirement 6: Scoring and Combos

**User Story:** As a player, I want to earn escalating points for eating multiple ghosts, so that skilled play is rewarded.

#### Acceptance Criteria

1. THE Game SHALL award 200 points for the first ghost eaten during a single Frightened_Mode activation
2. THE Game SHALL double the ghost score for each subsequent ghost eaten within the same Frightened_Mode activation (200, 400, 800, 1600)
3. THE Game SHALL display a brief score popup at the location where a ghost was eaten

---

### Requirement 7: Level Progression

**User Story:** As a player, I want the game to get harder as I progress, so that there is a long-term challenge.

#### Acceptance Criteria

1. WHEN the player advances to a new level, THE Game SHALL reset the maze with all dots and power pellets restored
2. WHEN the player advances to a new level, THE Game SHALL increase ghost movement speed incrementally
3. WHEN the player advances to a new level, THE Game SHALL decrease the duration of Frightened_Mode incrementally, to a minimum of 1 second
4. WHEN the player advances to a new level, THE Game SHALL reset Pac-Man and all ghosts to their starting positions

---

### Requirement 8: Game States

**User Story:** As a player, I want clear game states (start, playing, paused, game over), so that I can manage my session.

#### Acceptance Criteria

1. WHEN the application loads, THE Game SHALL display a start screen with the game title and instructions to press a key to begin
2. WHEN the player presses a key on the start screen, THE Game SHALL transition to the Playing state and begin the game loop
3. WHEN the player presses the Escape key during the Playing state, THE Game SHALL toggle between Playing and Paused states
4. WHILE in the Paused state, THE Game SHALL halt all movement and display a "PAUSED" overlay
5. WHEN the Game Over state is reached, THE Game SHALL display the final Score and offer the player an option to restart

---

### Requirement 9: Audio Feedback

**User Story:** As a player, I want sound effects for key events, so that the game feels responsive and immersive.

#### Acceptance Criteria

1. WHEN Pac-Man collects a dot, THE Game SHALL play a brief chomp sound effect
2. WHEN Pac-Man collects a power pellet, THE Game SHALL play a power pellet sound effect
3. WHEN Pac-Man is caught by a ghost, THE Game SHALL play a death sound effect
4. WHEN a ghost is eaten in Frightened_Mode, THE Game SHALL play an eat-ghost sound effect
5. WHERE audio is not supported by the browser, THE Game SHALL continue operating without audio and without displaying an error

---

### Requirement 10: Fruit Bonus

**User Story:** As a player, I want bonus fruit to appear in the maze, so that I have an opportunity for extra points.

#### Acceptance Criteria

1. WHEN 70 dots have been eaten in a level, THE Game SHALL spawn a bonus fruit item in the center of the maze
2. WHEN 170 dots have been eaten in a level, THE Game SHALL spawn a second bonus fruit item
3. WHEN Pac-Man occupies the tile containing a bonus fruit, THE Game SHALL remove the fruit and add the fruit's point value to the Score
4. WHEN a bonus fruit has been present for 9 seconds without being collected, THE Game SHALL remove the fruit from the maze
