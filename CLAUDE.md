# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A classic Tetris implementation in vanilla JavaScript using the HTML5 Canvas API — no dependencies, no build step, no framework. The entire game is three files: `index.html`, `style.css`, `game.js`.

## Running the game

There is no build/install/test tooling — just open or serve the static files.

```bash
start index.html        # Windows: open directly
# or serve locally (recommended, e.g. for consistent module/CORS behavior):
python3 -m http.server 8000
npx serve .
```

Then visit `http://localhost:8000`. There are no lint or test scripts to run.

## Architecture

Everything lives in `game.js` as top-level module state and functions (no classes, no build-time modules).

- **Board model**: `board` is a `ROWS × COLS` array where each cell is `0` (empty) or a color index `1–7` identifying a locked piece.
- **Pieces**: `PIECES` defines the 7 tetrominoes as square matrices. `current` and `next` hold `{ type, shape, x, y }`. Rotation (`rotateCW`) transposes + reverses rows; `tryRotate` applies `rotateCW` then attempts wall kicks at offsets `[0, -1, 1, -2, 2]` before giving up.
- **Collision** (`collide`): checks board bounds and overlap with locked cells for a given shape/offset — used for movement, rotation, ghost-piece projection, and spawn-blocking (game over) checks.
- **Game loop** (`loop`): driven by `requestAnimationFrame`, accumulates elapsed time in `dropAccum` and advances the piece one row (or locks it via `lockPiece`) once `dropAccum >= dropInterval`.
- **Locking/clearing**: `lockPiece` → `merge` (writes the piece into `board`) → `clearLines` (scans bottom-up, splices full rows, unshifts empty ones at the top) → `spawn` (promotes `next` to `current`, generates a new `next`, and triggers `endGame` if the new piece immediately collides).
- **Scoring/leveling**: `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by `level`; hard drop adds 2 points per cell dropped, soft drop adds 1 point per row. `level` increments every 10 lines cleared; `dropInterval = max(100, 1000 - (level - 1) * 90)` ms.
- **Rendering**: `draw()` clears and redraws the grid, locked board, ghost piece (`ghostY()` projects straight down, rendered at `globalAlpha = 0.2`), and the current piece, all via `drawBlock`. `drawNext()` renders the next-piece preview onto a separate canvas (`#next-canvas`).
- **Input**: a single `keydown` listener dispatches on `e.code` (arrow keys, `Space` for hard drop, `KeyX`/`ArrowUp` for rotate, `KeyP` for pause) and is gated by `paused`/`gameOver` state.

### Key tunables (in `game.js`)

`COLS`, `ROWS`, `BLOCK` (cell size in px), `COLORS`, `LINE_SCORES`, `dropInterval`. If `COLS`/`ROWS`/`BLOCK` change, the `<canvas id="board">` `width`/`height` in `index.html` must be updated to match (`COLS × BLOCK`, `ROWS × BLOCK`).
