import { mountChrome } from "../core/shell.js";
import { beep } from "../core/pwa.js";
import { getModeProgress, recordRun } from "../core/storage.js";

const board = document.getElementById("memory-board");
const tiles = [...board.querySelectorAll("[data-tile]")];
const status = document.getElementById("memory-status");
const roundEl = document.getElementById("memory-round");
const bestEl = document.getElementById("memory-best");
const startButton = document.getElementById("memory-start");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const TOTAL = 8;
let sequence = [];
let position = 0;
let accepting = false;
let generation = 0;
let startedAt = 0;

function showBest() {
  const progress = getModeProgress("memory", "sequence")["1"];
  bestEl.textContent = `BEST ${String(progress?.bestCorrect || 0).padStart(2, "0")}`;
}

async function flash(index, duration) {
  const tile = tiles[index];
  tile.classList.add("is-lit");
  beep("tap");
  await sleep(duration);
  tile.classList.remove("is-lit");
}

async function playPattern(token) {
  accepting = false;
  status.textContent = "Watch the pattern.";
  await sleep(500);
  for (const index of sequence) {
    if (token !== generation) return;
    await flash(index, Math.max(300, 580 - sequence.length * 25));
    await sleep(180);
  }
  if (token !== generation) return;
  position = 0;
  accepting = true;
  status.textContent = "Your turn. Repeat the tiles in order.";
}

function finish(passed) {
  accepting = false;
  generation += 1;
  const completed = passed ? TOTAL : sequence.length - 1;
  recordRun({
    gameId: "memory", modeId: "sequence", levelId: 1,
    correct: completed, total: TOTAL, timeMs: Date.now() - startedAt,
    passed, stars: passed ? 3 : completed >= 5 ? 2 : completed >= 2 ? 1 : 0,
  });
  status.textContent = passed ? "All eight rounds cleared!" : `Pattern missed. You cleared ${completed} rounds.`;
  startButton.textContent = "Play again";
  startButton.classList.remove("hidden");
  showBest();
}

function input(index) {
  if (!accepting) return;
  flash(index, 180);
  if (index !== sequence[position]) { beep("bad"); finish(false); return; }
  position += 1;
  if (position < sequence.length) return;
  accepting = false;
  if (sequence.length >= TOTAL) { finish(true); return; }
  status.textContent = "Correct. Next round…";
  const token = generation;
  setTimeout(() => {
    if (token !== generation) return;
    sequence.push(Math.floor(Math.random() * 4));
    roundEl.textContent = `ROUND ${String(sequence.length).padStart(2, "0")} / 08`;
    playPattern(token);
  }, 750);
}

function start() {
  generation += 1;
  const token = generation;
  sequence = [Math.floor(Math.random() * 4)];
  position = 0;
  startedAt = Date.now();
  roundEl.textContent = "ROUND 01 / 08";
  startButton.classList.add("hidden");
  playPattern(token);
}

board.addEventListener("click", (event) => {
  const tile = event.target.closest("[data-tile]");
  if (tile) input(Number(tile.dataset.tile));
});
document.addEventListener("keydown", (event) => {
  if (/^[1-4]$/.test(event.key)) input(Number(event.key) - 1);
});
startButton.addEventListener("click", start);
mountChrome();
showBest();
