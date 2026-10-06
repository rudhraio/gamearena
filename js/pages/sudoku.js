import { mountChrome } from "../core/shell.js";
import { beep } from "../core/pwa.js";
import { recordRun } from "../core/storage.js";
import { hasConflict, isSolved, makePuzzle } from "../games/sudoku.js";

const DRAFT_KEY = "gamearena.sudoku.draft.v1";
const DIFFICULTIES = ["easy", "medium", "hard"];
const boardEl = document.getElementById("sudoku-board");
const keypadEl = document.getElementById("sudoku-keypad");
const statusEl = document.getElementById("sudoku-status");
const clockEl = document.getElementById("sudoku-clock");
const feedbackEl = document.getElementById("sudoku-feedback");
let game = null;
let selected = -1;
let notesMode = false;

function loadDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
    if (!draft || !DIFFICULTIES.includes(draft.difficulty)) return null;
    if (![draft.puzzle, draft.solution, draft.board, draft.notes].every((list) => Array.isArray(list) && list.length === 81)) return null;
    const digit = (value) => Number.isInteger(value) && value >= 0 && value <= 9;
    if (!draft.puzzle.every(digit) || !draft.board.every(digit)) return null;
    if (!draft.solution.every((value) => digit(value) && value > 0)) return null;
    if (!draft.notes.every((value) => typeof value === "string" && /^[1-9]{0,9}$/.test(value))) return null;
    if (!Number.isFinite(draft.startedAt) || draft.startedAt < 0 || !Number.isSafeInteger(draft.hints) || draft.hints < 0) return null;
    if (draft.completed && (!Number.isFinite(draft.elapsedMs) || draft.elapsedMs < 0)) return null;
    if (draft.puzzle.some((value, i) => value && (draft.board[i] !== value || draft.solution[i] !== value))) return null;
    return draft;
  } catch { return null; }
}

function saveDraft() {
  try {
    if (game) localStorage.setItem(DRAFT_KEY, JSON.stringify(game));
    else localStorage.removeItem(DRAFT_KEY);
  } catch { /* Storage may be unavailable. */ }
}

function elapsed() {
  return game ? (game.completed ? game.elapsedMs : Math.max(0, Date.now() - game.startedAt)) : 0;
}

function clock() {
  const seconds = Math.floor(elapsed() / 1000);
  clockEl.textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function render() {
  const difficulty = game?.difficulty || "easy";
  document.getElementById("sudoku-difficulty").innerHTML = DIFFICULTIES.map((id) =>
    `<button class="btn ${id === difficulty ? "btn-fill" : ""}" type="button" data-difficulty="${id}" aria-pressed="${id === difficulty}">${id}</button>`
  ).join("");
  statusEl.textContent = game ? `${game.completed ? "SOLVED · " : ""}${difficulty.toUpperCase()} · ${game.puzzle.filter(Boolean).length} clues · ${game.hints} hints` : "Choose a difficulty";
  boardEl.innerHTML = Array.from({ length: 81 }, (_, index) => {
    const value = game?.board[index] || 0;
    const fixed = Boolean(game?.puzzle[index]);
    const conflict = Boolean(game && hasConflict(game.board, index));
    const notes = !value && game?.notes[index] ? game.notes[index] : "";
    const row = Math.floor(index / 9) + 1;
    const col = index % 9 + 1;
    return `<button type="button" class="sudoku-cell ${fixed ? "is-given" : ""} ${conflict ? "is-conflict" : ""} ${index === selected ? "is-selected" : ""}" data-index="${index}" role="gridcell" aria-label="Row ${row} column ${col}${value ? `, ${value}` : ", empty"}">${value || (notes ? `<span class="sudoku-notes">${notes.split("").join(" ")}</span>` : "")}</button>`;
  }).join("");
  document.getElementById("sudoku-notes").textContent = notesMode ? "Notes on" : "Notes off";
  document.getElementById("sudoku-notes").setAttribute("aria-pressed", String(notesMode));
  clock();
}

function start(difficulty, confirmDiscard = true) {
  if (confirmDiscard && game && !game.completed && !confirm("Start a new puzzle and replace your saved board?")) return;
  feedbackEl.textContent = "Generating a puzzle…";
  requestAnimationFrame(() => setTimeout(() => {
    const built = makePuzzle(difficulty);
    game = { ...built, difficulty, board: [...built.puzzle], notes: Array(81).fill(""), hints: 0, startedAt: Date.now() };
    selected = -1;
    notesMode = false;
    feedbackEl.textContent = "Tap an empty square to begin.";
    saveDraft();
    render();
  }, 0));
}

function finish() {
  const timeMs = elapsed();
  game.completed = true;
  game.elapsedMs = timeMs;
  recordRun({
    gameId: "sudoku", modeId: game.difficulty, levelId: 1,
    correct: 1, total: 1, timeMs, passed: true,
    stars: game.hints === 0 ? 3 : game.hints <= 2 ? 2 : 1,
    extra: { hints: game.hints, waypoints: game.puzzle.filter(Boolean).length },
  });
  feedbackEl.textContent = `Solved in ${clockEl.textContent}! Start another puzzle whenever you like.`;
  beep("ok");
  selected = -1;
  saveDraft();
  render();
}

function enter(value) {
  if (!game || game.completed || selected < 0 || game.puzzle[selected]) return;
  if (notesMode && value) {
    const current = game.notes[selected] || "";
    game.notes[selected] = current.includes(String(value))
      ? current.replace(String(value), "")
      : [...current, String(value)].sort().join("");
  } else {
    game.board[selected] = value;
    game.notes[selected] = "";
    beep("tap");
  }
  if (isSolved(game.board, game.solution)) { finish(); return; }
  feedbackEl.textContent = hasConflict(game.board, selected) ? "That number conflicts with its row, column, or box." : "";
  saveDraft();
  render();
}

boardEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-index]");
  if (!button || !game) return;
  selected = Number(button.dataset.index);
  render();
});
keypadEl.innerHTML = Array.from({ length: 9 }, (_, i) => `<button class="key" type="button" data-value="${i + 1}">${i + 1}</button>`).join("");
keypadEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-value]");
  if (button) enter(Number(button.dataset.value));
});
document.getElementById("sudoku-difficulty").addEventListener("click", (event) => {
  const button = event.target.closest("[data-difficulty]");
  if (button) start(button.dataset.difficulty);
});
document.getElementById("sudoku-new").addEventListener("click", () => start(game?.difficulty || "easy"));
document.getElementById("sudoku-notes").addEventListener("click", () => { notesMode = !notesMode; render(); });
document.getElementById("sudoku-erase").addEventListener("click", () => enter(0));
document.getElementById("sudoku-hint").addEventListener("click", () => {
  if (!game || game.completed) return;
  const index = selected >= 0 && !game.puzzle[selected] && game.board[selected] !== game.solution[selected]
    ? selected : game.board.findIndex((value, i) => value !== game.solution[i]);
  if (index < 0) return;
  selected = index;
  game.board[index] = game.solution[index];
  game.notes[index] = "";
  game.hints += 1;
  if (isSolved(game.board, game.solution)) { finish(); return; }
  feedbackEl.textContent = "One square revealed.";
  saveDraft();
  render();
});
document.addEventListener("keydown", (event) => {
  if (!game || selected < 0 || event.altKey || event.metaKey || event.ctrlKey) return;
  if (/^[1-9]$/.test(event.key)) enter(Number(event.key));
  if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") { event.preventDefault(); enter(0); }
});
mountChrome();
game = loadDraft();
render();
setInterval(clock, 1000);
