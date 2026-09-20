'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#64b5f6', // J - pale blue
  '#ffb74d', // L - orange
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

// Softened palette used by the "pastel" skin.
const PASTEL_COLORS = [
  null,
  '#b3e5fc', // I
  '#fff9c4', // O
  '#e1bee7', // T
  '#c8e6c9', // S
  '#ffcdd2', // Z
  '#bbdefb', // J
  '#ffe0b2', // L
];

function drawRoundedRectPath(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + w - r, y);
  context.quadraticCurveTo(x + w, y, x + w, y + r);
  context.lineTo(x + w, y + h - r);
  context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  context.lineTo(x + r, y + h);
  context.quadraticCurveTo(x, y + h, x, y + h - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

const SKINS = {
  retro: {
    label: 'Retro',
    draw(context, x, y, colorIndex, size) {
      const color = COLORS[colorIndex];
      context.fillStyle = color;
      context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      context.fillStyle = blockHighlightColor;
      context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
    },
  },
  neon: {
    label: 'Neón',
    boardBg: '#050508',
    draw(context, x, y, colorIndex, size) {
      const color = COLORS[colorIndex];
      const px = x * size + 2;
      const py = y * size + 2;
      const w = size - 4;
      const h = size - 4;
      context.shadowBlur = size * 0.7;
      context.shadowColor = color;
      context.fillStyle = color;
      context.fillRect(px, py, w, h);
      context.shadowBlur = 0;
      context.strokeStyle = 'rgba(255,255,255,0.55)';
      context.lineWidth = 1;
      context.strokeRect(px + 0.5, py + 0.5, Math.max(w - 1, 0), Math.max(h - 1, 0));
    },
  },
  pastel: {
    label: 'Pastel',
    draw(context, x, y, colorIndex, size) {
      const color = PASTEL_COLORS[colorIndex];
      const px = x * size + 1;
      const py = y * size + 1;
      const w = size - 2;
      const h = size - 2;
      const r = Math.min(6, w / 3, h / 3);
      context.fillStyle = color;
      if (typeof context.roundRect === 'function') {
        context.beginPath();
        context.roundRect(px, py, w, h, r);
        context.fill();
      } else {
        drawRoundedRectPath(context, px, py, w, h, r);
        context.fill();
      }
      context.fillStyle = 'rgba(255,255,255,0.45)';
      const highlightH = Math.max(h * 0.35, 3);
      if (typeof context.roundRect === 'function') {
        context.beginPath();
        context.roundRect(px, py, w, highlightH, [r, r, 0, 0]);
        context.fill();
      } else {
        const hr = Math.min(r, highlightH / 2);
        context.beginPath();
        context.moveTo(px + hr, py);
        context.lineTo(px + w - hr, py);
        context.quadraticCurveTo(px + w, py, px + w, py + hr);
        context.lineTo(px + w, py + highlightH);
        context.lineTo(px, py + highlightH);
        context.lineTo(px, py + hr);
        context.quadraticCurveTo(px, py, px + hr, py);
        context.closePath();
        context.fill();
      }
    },
  },
  pixel: {
    label: 'Pixel art',
    draw(context, x, y, colorIndex, size) {
      const color = COLORS[colorIndex];
      const px = x * size + 1;
      const py = y * size + 1;
      const w = size - 2;
      const h = size - 2;
      context.fillStyle = color;
      context.fillRect(px, py, w, h);
      const cell = Math.max(2, Math.floor(size / 6));
      context.fillStyle = 'rgba(0,0,0,0.18)';
      for (let ry = 0; ry * cell < h; ry++) {
        for (let rx = 0; rx * cell < w; rx++) {
          if ((rx + ry) % 2 === 0) {
            const bx = px + rx * cell;
            const by = py + ry * cell;
            const bw = Math.min(cell, px + w - bx);
            const bh = Math.min(cell, py + h - by);
            context.fillRect(bx, by, bw, bh);
          }
        }
      }
      context.strokeStyle = 'rgba(0,0,0,0.35)';
      context.lineWidth = 1;
      context.strokeRect(px + 0.5, py + 0.5, Math.max(w - 1, 0), Math.max(h - 1, 0));
    },
  },
};

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggle = document.getElementById('theme-toggle');
const pauseMenu = document.getElementById('pause-menu');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const controlsToggleBtn = document.getElementById('controls-toggle-btn');
const pauseControls = document.getElementById('pause-controls');
const startLevelSelect = document.getElementById('start-level-select');

const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const startRecordsList = document.getElementById('start-records-list');
const startRecordsSummary = document.getElementById('start-records-summary');
const resetRecordsBtn = document.getElementById('reset-records-btn');
const resetRecordsBtnOverlay = document.getElementById('reset-records-btn-overlay');
const nameEntry = document.getElementById('name-entry');
const nameInput = document.getElementById('name-input');
const overlayRecordsPanel = document.getElementById('overlay-records-panel');
const overlayRecordsList = document.getElementById('overlay-records-list');
const overlayRecordsSummary = document.getElementById('overlay-records-summary');
const skinSelect = document.getElementById('skin-select');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let gameStarted = false;
let comboStreak = 0;
let bestComboThisGame = 0;
let pendingRecord = null;

const THEME_KEY = 'tetris-theme';
const START_LEVEL_KEY = 'tetris-start-level';
let gridLineColor = '#22222e';
let blockHighlightColor = 'rgba(255,255,255,0.12)';

const MIN_START_LEVEL = 1;
const MAX_START_LEVEL = 15;

function loadStartLevel() {
  const stored = parseInt(localStorage.getItem(START_LEVEL_KEY), 10);
  if (Number.isInteger(stored) && stored >= MIN_START_LEVEL && stored <= MAX_START_LEVEL) return stored;
  return MIN_START_LEVEL;
}

function saveStartLevel(value) {
  localStorage.setItem(START_LEVEL_KEY, String(value));
}

function refreshThemeColors() {
  const styles = getComputedStyle(document.body);
  gridLineColor = styles.getPropertyValue('--grid-line').trim() || gridLineColor;
  blockHighlightColor = styles.getPropertyValue('--block-highlight').trim() || blockHighlightColor;
}

function applyTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  if (themeToggle) themeToggle.checked = theme === 'light';
  refreshThemeColors();
}

function loadTheme() {
  return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
}

applyTheme(loadTheme());

if (themeToggle) {
  themeToggle.addEventListener('change', () => {
    const theme = themeToggle.checked ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
    if (typeof current !== 'undefined' && current) {
      draw();
      drawNext();
    }
  });
}

const RECORDS_KEY = 'tetris-records';

function loadRecords() {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

function qualifiesForRecords(records, scoreValue) {
  if (records.length < 5) return true;
  return scoreValue > records[records.length - 1].score;
}

function addRecord(entry) {
  const records = loadRecords();
  records.push(entry);
  records.sort((a, b) => b.score - a.score);
  const top5 = records.slice(0, 5);
  saveRecords(top5);
  return top5;
}

function clearRecords() {
  saveRecords([]);
  pendingRecord = null;
  if (nameEntry) nameEntry.classList.add('hidden');
  renderAllRecords(null);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function formatDate(timestamp) {
  try {
    return new Date(timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return '';
  }
}

function renderRecordsList(container, records, highlightId) {
  if (!container) return;
  if (!records.length) {
    container.innerHTML = '<p class="records-empty">Aún no hay récords. ¡Sé el primero!</p>';
    return;
  }
  const rows = records.map((r, i) => `
    <tr class="${r.id === highlightId ? 'highlight' : ''}">
      <td>${i + 1}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${r.score.toLocaleString()}</td>
      <td>${r.lines}</td>
      <td>${r.combo}</td>
      <td>${formatDate(r.date)}</td>
    </tr>`).join('');
  container.innerHTML = `
    <table class="records-table">
      <thead>
        <tr><th>#</th><th>Nombre</th><th>Puntuación</th><th>Líneas</th><th>Combo</th><th>Fecha</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderRecordsSummary(el, records) {
  if (!el) return;
  if (!records.length) {
    el.textContent = '';
    return;
  }
  const bestCombo = Math.max(...records.map(r => r.combo || 0));
  const maxLines = Math.max(...records.map(r => r.lines || 0));
  el.textContent = `Mejor combo: ${bestCombo} · Máx. líneas en una partida: ${maxLines}`;
}

function renderAllRecords(highlightId) {
  const records = loadRecords();
  renderRecordsList(startRecordsList, records, highlightId);
  renderRecordsSummary(startRecordsSummary, records);
  renderRecordsList(overlayRecordsList, records, highlightId);
  renderRecordsSummary(overlayRecordsSummary, records);
}

function commitPendingRecord() {
  if (!pendingRecord) return;
  const raw = (nameInput.value || '').trim().slice(0, 12);
  const entry = { ...pendingRecord, name: raw || 'Jugador' };
  pendingRecord = null;
  addRecord(entry);
  nameEntry.classList.add('hidden');
  renderAllRecords(entry.id);
}

if (nameInput) {
  nameInput.addEventListener('blur', commitPendingRecord);
  nameInput.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.code === 'Enter') {
      nameInput.blur();
    }
  });
}

const SKIN_KEY = 'tetris-skin';
let currentSkin = 'retro';

function applySkin(skin) {
  currentSkin = SKINS[skin] ? skin : 'retro';
  if (skinSelect) skinSelect.value = currentSkin;
}

function loadSkin() {
  const stored = localStorage.getItem(SKIN_KEY);
  return SKINS[stored] ? stored : 'retro';
}

applySkin(loadSkin());

if (skinSelect) {
  skinSelect.addEventListener('change', () => {
    const skin = skinSelect.value;
    localStorage.setItem(SKIN_KEY, skin);
    applySkin(skin);
    if (typeof current !== 'undefined' && current) {
      draw();
      drawNext();
    }
  });
}

if (resetRecordsBtn) resetRecordsBtn.addEventListener('click', clearRecords);
if (resetRecordsBtnOverlay) resetRecordsBtnOverlay.addEventListener('click', clearRecords);

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function computeDropInterval(lvl) {
  return Math.max(100, 1000 - (lvl - 1) * 90);
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = computeDropInterval(level);
    updateHUD();
  }
  return cleared;
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  const cleared = clearLines();
  if (cleared > 0) {
    comboStreak++;
    if (comboStreak > bestComboThisGame) bestComboThisGame = comboStreak;
  } else {
    comboStreak = 0;
  }
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const skin = SKINS[currentSkin] || SKINS.retro;
  context.globalAlpha = alpha ?? 1;
  context.shadowBlur = 0;
  context.shadowColor = 'transparent';
  skin.draw(context, x, y, colorIndex, size);
  context.shadowBlur = 0;
  context.shadowColor = 'transparent';
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = gridLineColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const skin = SKINS[currentSkin] || SKINS.retro;
  if (skin.boardBg) {
    ctx.fillStyle = skin.boardBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const skin = SKINS[currentSkin] || SKINS.retro;
  if (skin.boardBg) {
    nextCtx.fillStyle = skin.boardBg;
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  }
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
  if (overlayRecordsPanel) overlayRecordsPanel.classList.remove('hidden');

  const records = loadRecords();
  if (qualifiesForRecords(records, score)) {
    pendingRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: '',
      score,
      lines,
      combo: bestComboThisGame,
      date: Date.now(),
    };
    if (nameEntry) {
      nameEntry.classList.remove('hidden');
      nameInput.value = '';
      setTimeout(() => nameInput.focus(), 0);
    }
    renderAllRecords(null);
  } else {
    pendingRecord = null;
    if (nameEntry) nameEntry.classList.add('hidden');
    renderAllRecords(null);
  }
}

function openPauseMenu() {
  if (gameOver || paused) return;
  paused = true;
  cancelAnimationFrame(animId);
  pauseMenu.classList.remove('hidden');
}

function closePauseMenu() {
  if (!paused) return;
  paused = false;
  pauseMenu.classList.add('hidden');
  lastTime = performance.now();
  loop(lastTime);
}

function togglePauseMenu() {
  if (gameOver) return;
  if (paused) closePauseMenu();
  else openPauseMenu();
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
      if (gameOver) return;
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = loadStartLevel();
  paused = false;
  gameOver = false;
  comboStreak = 0;
  bestComboThisGame = 0;
  pendingRecord = null;
  dropInterval = computeDropInterval(level);
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  if (nameEntry) nameEntry.classList.add('hidden');
  overlay.classList.add('hidden');
  pauseMenu.classList.add('hidden');
  pauseControls.classList.add('hidden');
  if (startLevelSelect) startLevelSelect.value = String(level);
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
  gameStarted = true;
}

document.addEventListener('keydown', e => {
  if (!gameStarted) return;
  if (e.code === 'KeyP' || e.code === 'Escape') { togglePauseMenu(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      e.preventDefault();
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      e.preventDefault();
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      e.preventDefault();
      softDrop();
      break;
    case 'ArrowUp':
      e.preventDefault();
      tryRotate();
      break;
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', () => {
  overlay.classList.add('hidden');
  init();
});

resumeBtn.addEventListener('click', closePauseMenu);

pauseRestartBtn.addEventListener('click', () => {
  init();
});

controlsToggleBtn.addEventListener('click', () => {
  pauseControls.classList.toggle('hidden');
});

if (startLevelSelect) {
  startLevelSelect.value = String(loadStartLevel());
  startLevelSelect.addEventListener('change', () => {
    const value = parseInt(startLevelSelect.value, 10);
    if (Number.isInteger(value) && value >= MIN_START_LEVEL && value <= MAX_START_LEVEL) {
      saveStartLevel(value);
    }
  });
}

if (startBtn) {
  startBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    init();
  });
}

renderAllRecords(null);
