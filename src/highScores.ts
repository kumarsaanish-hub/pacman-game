const STORAGE_KEY = 'pacman-high-scores';
const MAX_SCORES = 5;

export type ScoreKey = 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD';

function getKey(difficulty: ScoreKey): string {
  return `${STORAGE_KEY}-${difficulty}`;
}

export function getHighScores(difficulty: ScoreKey): number[] {
  try {
    const raw = localStorage.getItem(getKey(difficulty));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHighScore(score: number, difficulty: ScoreKey): number[] {
  const scores = getHighScores(difficulty);
  scores.push(score);
  scores.sort((a, b) => b - a);
  const top = scores.slice(0, MAX_SCORES);
  try {
    localStorage.setItem(getKey(difficulty), JSON.stringify(top));
  } catch { /* ignore */ }
  return top;
}
