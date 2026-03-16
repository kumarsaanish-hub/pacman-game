import { Game, createInitialState } from './game';
import { InputHandler } from './input';
import { Renderer } from './renderer';
import { CollisionDetector } from './collision';
import { AudioManager } from './audio';
import { getHighScores, saveHighScore } from './highScores';
import type { Difficulty } from './types';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
const errorMessage = document.getElementById('error-message') as HTMLDivElement;
const scoresList = document.getElementById('scores-list') as HTMLOListElement;
const leaderboardTitle = document.getElementById('leaderboard-title') as HTMLElement;

let currentDifficulty: Difficulty = 'MEDIUM';

function renderLeaderboard(difficulty: Difficulty): void {
  const labels: Record<Difficulty, string> = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard', VERY_HARD: 'Very Hard' };
  leaderboardTitle.textContent = `HIGH SCORES (${labels[difficulty]})`;
  const scores = getHighScores(difficulty);
  const colors = ['gold', 'silver', 'bronze'];
  scoresList.innerHTML = scores.length
    ? scores.map((s, i) => `<li class="${colors[i] ?? ''}">${s.toLocaleString()}</li>`).join('')
    : '<li style="color:#555">No scores yet</li>';
}

renderLeaderboard(currentDifficulty);

if (!canvas || !canvas.getContext('2d')) {
  if (canvas) canvas.style.display = 'none';
  errorMessage.style.display = 'block';
  errorMessage.textContent = 'Unable to initialize canvas. Please use a modern browser.';
} else {
  const input = new InputHandler();
  let state = createInitialState(currentDifficulty);
  let game = new Game(state, input);
  const renderer = new Renderer(canvas);
  const audioManager = new AudioManager();
  let collisionDetector = new CollisionDetector(game, audioManager);
  game.setCollisionDetector(collisionDetector);

  let lastTime: number | null = null;
  let savedScore = false;

  // Difficulty buttons
  const btns = document.querySelectorAll<HTMLButtonElement>('.diff-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const d = btn.dataset.diff as Difficulty;
      currentDifficulty = d;
      btns.forEach(b => b.classList.toggle('active', b.dataset.diff === d));
      renderLeaderboard(d);
      // Restart game with new difficulty
      state = createInitialState(d);
      game = new Game(state, input);
      collisionDetector = new CollisionDetector(game, audioManager);
      game.setCollisionDetector(collisionDetector);
      savedScore = false;
      lastTime = null;
    });
  });

  // Set default active button
  document.querySelector<HTMLButtonElement>('[data-diff="MEDIUM"]')?.classList.add('active');

  // Pause button
  const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
  pauseBtn.addEventListener('click', () => {
    game.pause();
    const phase = game.getState().phase;
    pauseBtn.textContent = phase === 'PAUSED' ? '▶ Resume' : '⏸ Pause';
  });
  function loop(timestamp: number): void {
    const deltaMs = lastTime !== null ? timestamp - lastTime : 0;
    lastTime = timestamp;

    game.tick(deltaMs);
    const currentState = game.getState();
    renderer.render(currentState);

    // Save score once when game over
    if (currentState.phase === 'GAME_OVER' && !savedScore) {
      savedScore = true;
      saveHighScore(currentState.score, currentDifficulty);
      renderLeaderboard(currentDifficulty);
    }

    // Reset flag when game restarts
    if (currentState.phase === 'PLAYING' && savedScore) {
      savedScore = false;
    }

    // Sync pause button label with actual game state
    pauseBtn.textContent = currentState.phase === 'PAUSED' ? '▶ Resume' : '⏸ Pause';

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}
