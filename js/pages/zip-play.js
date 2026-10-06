import { qs, routes } from "../core/registry.js";
import { isLevelUnlocked, recordRun } from "../core/storage.js";
import {
  canEnter,
  generatePuzzle,
  getZipLevel,
  getZipLevels,
  isComplete,
  numAt,
  parseEdge,
  zipStars,
  ZIP_DIFFICULTIES,
  zipModeId,
} from "../games/zip.js";
import { beep } from "../core/pwa.js";
import { mountChrome } from "../core/shell.js";

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${pad(m)}:${pad(s % 60)}`;
}

function same(a, b) {
  return a && b && a.r === b.r && a.c === b.c;
}

document.addEventListener("alpine:init", () => {
  window.Alpine.data("zipPlay", () => ({
    levelId: Number(qs("level", "1")),
    difficulty: qs("difficulty", "low"),
    level: null,
    puzzle: null,
    solution: null,
    path: [],
    hints: 0,
    startedAt: 0,
    elapsed: 0,
    timer: null,
    locked: false,
    drawing: false,
    didMove: false,
    pendingRewind: null,
    downCell: null,
    showStart: true,
    showResult: false,
    passed: false,
    stars: 0,
    nextLevel: null,
    nextHref: "",
    retryHref: "",
    levelsHref: "",
    tick: 0,
    cellList: [],
    wallList: [],

    init() {
      if (!ZIP_DIFFICULTIES.some((mode) => mode.id === this.difficulty)) this.difficulty = "low";
      this.level = getZipLevel(this.levelId);
      if (!this.level) {
        window.location.replace(routes.zip);
        return;
      }
      if (!isLevelUnlocked("zip", zipModeId(this.difficulty), this.levelId)) {
        window.location.replace(`${routes.zip}?difficulty=${this.difficulty}`);
        return;
      }
      this.retryHref = routes.zipPlay(this.levelId, this.difficulty);
      const levels = getZipLevels();
      this.nextLevel = levels.find((row) => row.id === this.levelId + 1) || null;
      this.nextHref = this.nextLevel
        ? routes.zipPlay(this.nextLevel.id, this.difficulty)
        : `${routes.zip}?difficulty=${this.difficulty}`;
      this.levelsHref = `${routes.zip}?difficulty=${this.difficulty}`;
      document.title = `ZIP ${pad(this.levelId)} · GAME ARENA`;
      const nav = document.querySelector("[data-nav]");
      if (nav) {
        nav.dataset.back = this.levelsHref;
        nav.dataset.crumbs = `Hub:/|Zip:${routes.zip}`;
        nav.dataset.current = this.level.name;
      }
      mountChrome();
    },

    start() {
      const built = generatePuzzle(this.level, this.difficulty);
      this.puzzle = built.puzzle;
      this.solution = built.solution;
      this.path = [];
      this.hints = 0;
      this.locked = false;
      this.drawing = false;
      this.didMove = false;
      this.pendingRewind = null;
      this.downCell = null;
      this.showStart = false;
      this.showResult = false;
      this.elapsed = 0;
      this.startedAt = Date.now();
      this.cellList = this.buildCells();
      this.wallList = this.buildWalls();
      clearInterval(this.timer);
      this.timer = setInterval(() => {
        this.elapsed = Date.now() - this.startedAt;
      }, 200);
      this.tick += 1;
      this.$nextTick(() => this.bindPointer());
    },

    bindPointer() {
      const board = this.$refs.board;
      if (!board || board.dataset.bound === "1") return;
      board.dataset.bound = "1";
      board.addEventListener("pointerdown", (event) => this.onDown(event));
      board.addEventListener("pointermove", (event) => this.onMove(event));
      board.addEventListener("pointerup", (event) => this.onUp(event));
      board.addEventListener("pointercancel", (event) => this.onUp(event));
    },

    cellFromEvent(event) {
      const board = this.$refs.board;
      if (!board || !this.puzzle) return null;
      const rect = board.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;
      const n = this.puzzle.size;
      const c = Math.min(n - 1, Math.floor((x / rect.width) * n));
      const r = Math.min(n - 1, Math.floor((y / rect.height) * n));
      return { r, c };
    },

    onDown(event) {
      if (this.showStart || this.showResult || this.locked) return;
      const cell = this.cellFromEvent(event);
      if (!cell) return;

      const idx = this.indexOnPath(cell.r, cell.c);
      const head = this.path[this.path.length - 1];
      this.didMove = false;
      this.pendingRewind = null;
      this.downCell = cell;

      if (this.path.length === 0) {
        if (!this.extendTo(cell.r, cell.c)) return;
      } else if (head && same(head, cell)) {
        // Resume from the tip. Leave the line as-is.
      } else if (idx >= 0) {
        // A tap on an earlier path cell can rewind. Dragging across it must not.
        this.pendingRewind = idx;
      } else if (!this.extendTo(cell.r, cell.c)) {
        return;
      }

      this.drawing = true;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // capture optional
      }
      event.preventDefault();
    },

    onMove(event) {
      if (!this.drawing || this.locked) return;
      const cell = this.cellFromEvent(event);
      if (!cell) return;
      if (this.downCell && !same(this.downCell, cell)) this.didMove = true;
      this.nudgeToward(cell.r, cell.c);
      event.preventDefault();
    },

    onUp() {
      if (!this.didMove && this.pendingRewind != null && !this.locked) {
        this.trimTo(this.pendingRewind);
      }
      this.drawing = false;
      this.didMove = false;
      this.pendingRewind = null;
      this.downCell = null;
    },

    indexOnPath(r, c) {
      return this.path.findIndex((cell) => cell.r === r && cell.c === c);
    },

    extendTo(r, c) {
      if (!canEnter(this.puzzle, this.path, { r, c })) return false;
      this.path = [...this.path, { r, c }];
      this.tick += 1;
      this.checkWin();
      return true;
    },

    trimTo(idx) {
      if (idx < 0 || idx >= this.path.length - 1) return;
      this.path = this.path.slice(0, idx + 1);
      this.tick += 1;
    },

    stepBack() {
      if (this.path.length <= 1) return;
      this.path = this.path.slice(0, -1);
      this.tick += 1;
    },

    nudgeToward(r, c) {
      let guard = 0;
      while (guard < 32) {
        guard += 1;
        const head = this.path[this.path.length - 1];
        if (!head) {
          this.extendTo(r, c);
          return;
        }
        if (same(head, { r, c })) return;

        const idx = this.indexOnPath(r, c);
        if (idx >= 0 && idx === this.path.length - 2) {
          this.stepBack();
          continue;
        }
        if (idx >= 0) return;

        let nr = head.r;
        let nc = head.c;
        if (head.r !== r && (head.c === c || Math.abs(r - head.r) >= Math.abs(c - head.c))) {
          nr = head.r + Math.sign(r - head.r);
        } else if (head.c !== c) {
          nc = head.c + Math.sign(c - head.c);
        } else {
          return;
        }
        if (this.indexOnPath(nr, nc) >= 0) return;
        if (!this.extendTo(nr, nc)) return;
        if (this.locked) return;
      }
    },

    buildCells() {
      if (!this.puzzle) return [];
      const out = [];
      for (let r = 0; r < this.puzzle.size; r += 1) {
        for (let c = 0; c < this.puzzle.size; c += 1) {
          out.push({ r, c, key: `${r},${c}`, num: numAt(this.puzzle, r, c) });
        }
      }
      return out;
    },

    buildWalls() {
      if (!this.puzzle) return [];
      return this.puzzle.walls.map((key) => {
        const [a, b] = parseEdge(key);
        return { key, a, b, vertical: a.r === b.r };
      });
    },

    wallStyle(wall) {
      if (!this.puzzle) return "";
      const n = this.puzzle.size;
      const pct = 100 / n;
      if (wall.vertical) {
        const col = Math.min(wall.a.c, wall.b.c);
        return `left:${(col + 1) * pct}%;top:${wall.a.r * pct}%;width:8px;height:${pct}%;transform:translateX(-50%);`;
      }
      const row = Math.min(wall.a.r, wall.b.r);
      return `left:${wall.a.c * pct}%;top:${(row + 1) * pct}%;width:${pct}%;height:8px;transform:translateY(-50%);`;
    },

    onPath(r, c) {
      return this.indexOnPath(r, c) >= 0;
    },

    isHead(r, c) {
      const head = this.path[this.path.length - 1];
      return Boolean(head && head.r === r && head.c === c);
    },

    pathD() {
      this.tick;
      if (!this.puzzle || this.path.length < 2) return "";
      const n = this.puzzle.size;
      const pts = this.path.map((cell) => {
        const x = ((cell.c + 0.5) / n) * 100;
        const y = ((cell.r + 0.5) / n) * 100;
        return `${x} ${y}`;
      });
      return `M ${pts[0]} ${pts.slice(1).map((p) => `L ${p}`).join(" ")}`;
    },

    headPoint() {
      this.tick;
      if (!this.puzzle || !this.path.length) return null;
      const n = this.puzzle.size;
      const head = this.path[this.path.length - 1];
      return {
        x: ((head.c + 0.5) / n) * 100,
        y: ((head.r + 0.5) / n) * 100,
        r: Math.max(1.8, 18 / n),
      };
    },

    strokeWidth() {
      if (!this.puzzle) return 4;
      return Math.max(2.4, 26 / this.puzzle.size);
    },

    progressPct() {
      if (!this.puzzle) return 0;
      return Math.round((this.path.length / (this.puzzle.size * this.puzzle.size)) * 100);
    },

    filledLabel() {
      if (!this.puzzle) return "00/00";
      const total = this.puzzle.size * this.puzzle.size;
      return `${pad(this.path.length)}/${pad(total)}`;
    },

    clock() {
      return formatTime(this.elapsed);
    },

    hint() {
      if (this.locked || this.showStart || this.showResult || !this.solution) return;
      this.hints += 1;
      beep("tap");
      const sol = this.solution;
      let i = 0;
      while (i < this.path.length && i < sol.length && same(this.path[i], sol[i])) i += 1;
      if (this.path.length === 0) {
        this.path = sol.slice(0, Math.min(2, sol.length)).map((cell) => ({ ...cell }));
      } else {
        this.path = sol.slice(0, Math.min(sol.length, i + 1)).map((cell) => ({ ...cell }));
      }
      this.tick += 1;
      this.checkWin();
    },

    undo() {
      if (this.locked || this.path.length === 0) return;
      this.path = this.path.slice(0, -1);
      this.tick += 1;
    },

    clearPath() {
      if (this.locked) return;
      this.path = [];
      this.tick += 1;
    },

    checkWin() {
      if (!isComplete(this.puzzle, this.path)) return;
      this.locked = true;
      this.drawing = false;
      beep("ok");
      window.setTimeout(() => this.finish(), 420);
    },

    finish() {
      clearInterval(this.timer);
      this.elapsed = Date.now() - this.startedAt;
      this.passed = true;
      this.stars = zipStars({
        timeMs: this.elapsed,
        hints: this.hints,
        threeStarMs: this.level.threeStarMs,
      });
      recordRun({
        gameId: "zip",
        modeId: zipModeId(this.difficulty),
        levelId: this.levelId,
        correct: 1,
        total: 1,
        timeMs: this.elapsed,
        passed: true,
        stars: this.stars,
        extra: {
          hints: this.hints,
          waypoints: this.puzzle.links,
        },
      });
      this.showResult = true;
    },

    destroy() {
      clearInterval(this.timer);
    },
  }));
});

import("../vendor/alpine.min.js");
