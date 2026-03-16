# Pac-Man

A browser-based Pac-Man game built with vanilla TypeScript and the HTML5 Canvas API.

## Features

- Classic 28×31 maze with dots, power pellets, tunnels, and ghost house
- Four ghosts (Blinky, Pinky, Inky, Clyde) with distinct AI behaviors
- Four difficulty levels: Easy, Medium, Hard, Very Hard
- Fruit bonuses: 🍒 Cherry (common), 🍊 Orange (rare), 🍋 Lemon (very rare)
- Top 5 high scores per difficulty, saved in localStorage
- Arrow keys or WASD to move, Escape or Pause button to pause

## Getting Started

```bash
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

## Controls

| Key | Action |
|-----|--------|
| Arrow keys / WASD | Move Pac-Man |
| Escape | Pause / Resume |
| R | Restart (on Game Over screen) |

## Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm test         # Run tests
```
