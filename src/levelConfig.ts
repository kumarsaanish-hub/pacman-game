import type { LevelConfig } from './types';

/**
 * Level configuration table (classic Pac-Man inspired).
 * - ghostSpeed is monotonically non-decreasing across levels
 * - frightenedDuration is monotonically non-increasing, minimum 1000ms
 * - frightenedSpeed < ghostSpeed for every level
 */
export const LEVEL_CONFIGS: LevelConfig[] = [
  // Level 1
  {
    ghostSpeed: 7.5,
    frightenedDuration: 7000,
    frightenedSpeed: 4.0,
    chaseScatterCycles: [
      { scatterDuration: 7000, chaseDuration: 20000 },
      { scatterDuration: 7000, chaseDuration: 20000 },
      { scatterDuration: 5000, chaseDuration: 20000 },
      { scatterDuration: 5000, chaseDuration: Infinity },
    ],
  },
  // Level 2
  {
    ghostSpeed: 8.5,
    frightenedDuration: 5000,
    frightenedSpeed: 4.5,
    chaseScatterCycles: [
      { scatterDuration: 7000, chaseDuration: 20000 },
      { scatterDuration: 7000, chaseDuration: 20000 },
      { scatterDuration: 5000, chaseDuration: 20000 },
      { scatterDuration: 5000, chaseDuration: Infinity },
    ],
  },
  // Level 3
  {
    ghostSpeed: 9.5,
    frightenedDuration: 4000,
    frightenedSpeed: 5.0,
    chaseScatterCycles: [
      { scatterDuration: 7000, chaseDuration: 20000 },
      { scatterDuration: 7000, chaseDuration: 20000 },
      { scatterDuration: 5000, chaseDuration: 20000 },
      { scatterDuration: 5000, chaseDuration: Infinity },
    ],
  },
  // Level 4
  {
    ghostSpeed: 10.5,
    frightenedDuration: 3000,
    frightenedSpeed: 5.5,
    chaseScatterCycles: [
      { scatterDuration: 7000, chaseDuration: 20000 },
      { scatterDuration: 7000, chaseDuration: 20000 },
      { scatterDuration: 5000, chaseDuration: 20000 },
      { scatterDuration: 5000, chaseDuration: Infinity },
    ],
  },
  // Level 5+ (clamped for all higher levels)
  {
    ghostSpeed: 11.5,
    frightenedDuration: 1000,
    frightenedSpeed: 6.0,
    chaseScatterCycles: [
      { scatterDuration: 5000, chaseDuration: 20000 },
      { scatterDuration: 5000, chaseDuration: 20000 },
      { scatterDuration: 5000, chaseDuration: 20000 },
      { scatterDuration: 5000, chaseDuration: Infinity },
    ],
  },
];

/**
 * Returns the LevelConfig for the given level number (1-indexed).
 * If level exceeds the array length, the last entry is returned (clamped).
 */
export function getLevelConfig(level: number): LevelConfig {
  const index = Math.min(level - 1, LEVEL_CONFIGS.length - 1);
  return LEVEL_CONFIGS[Math.max(0, index)];
}
