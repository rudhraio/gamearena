import { getMode, qs, routes } from "../core/registry.js";
import { isLevelUnlocked, recordRun } from "../core/storage.js";
import { generateQuestion, getMathLevel, getMathLevels, starCount } from "../games/math.js";
import { beep } from "../core/pwa.js";
import { mountChrome } from "../core/shell.js";

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${pad(m)}:${pad(r)}`;
}

document.addEventListener("alpine:init", () => {
  window.Alpine.data("mathPlay", () => ({
    modeId: qs("mode", "add"),
    levelId: Number(qs("level", "1")),
    mode: null,
    level: null,
    index: 0,
    total: 10,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    input: "",
    current: null,
    startedAt: 0,
    elapsed: 0,
    timer: null,
    locked: false,
    flash: "",
    showStart: true,
    showResult: false,
    passed: false,
    stars: 0,
    nextLevel: null,
    nextHref: "",
    retryHref: "",
    levelsHref: "",
    seen: null,

    init() {
      this.mode = getMode(this.modeId);
      this.level = getMathLevel(this.modeId, this.levelId);
      if (!this.mode || !this.level) {
        window.location.replace(routes.math);
        return;
      }
      if (!isLevelUnlocked("math", this.modeId, this.levelId)) {
        window.location.replace(routes.levels(this.modeId));
        return;
      }
      this.total = this.level.questions;
      this.retryHref = routes.play(this.modeId, this.levelId);
      const levels = getMathLevels(this.modeId);
      this.nextLevel = levels.find((l) => l.id === this.levelId + 1) || null;
      this.nextHref = this.nextLevel
        ? routes.play(this.modeId, this.nextLevel.id)
        : routes.levels(this.modeId);
      this.levelsHref = routes.levels(this.modeId);
      document.title = `${this.mode.title} ${pad(this.levelId)} · GAME ARENA`;
      const nav = document.querySelector("[data-nav]");
      if (nav) {
        nav.dataset.back = this.levelsHref;
        nav.dataset.crumbs = `Hub:/|Math:${routes.math}|${this.mode.title}:${this.levelsHref}`;
        nav.dataset.current = this.level.name;
      }
      mountChrome();
    },

    start() {
      this.showStart = false;
      this.index = 0;
      this.correct = 0;
      this.streak = 0;
      this.bestStreak = 0;
      this.elapsed = 0;
      this.startedAt = Date.now();
      this.seen = new Set();
      this.nextQuestion();
      this.timer = setInterval(() => {
        this.elapsed = Date.now() - this.startedAt;
      }, 200);
    },

    nextQuestion() {
      this.input = "";
      this.flash = "";
      this.locked = false;
      this.current = generateQuestion(this.modeId, this.level, this.seen);
    },

    progressPct() {
      return Math.round((this.index / this.total) * 100);
    },

    clock() {
      return formatTime(this.elapsed);
    },

    press(d) {
      if (this.locked || this.showStart || this.showResult) return;
      beep("tap");
      if (this.input.length >= 8) return;
      this.input += String(d);
    },

    backspace() {
      if (this.locked) return;
      this.input = this.input.slice(0, -1);
    },

    clear() {
      if (this.locked) return;
      this.input = "";
    },

    submit() {
      if (this.locked || this.input === "") return;
      const value = Number(this.input);
      this.locked = true;
      const ok = value === this.current.answer;
      if (ok) {
        this.correct += 1;
        this.streak += 1;
        this.bestStreak = Math.max(this.bestStreak, this.streak);
        this.flash = "ok";
        beep("ok");
      } else {
        this.streak = 0;
        this.flash = "bad";
        beep("bad");
        this.input = String(this.current.answer);
      }
      window.setTimeout(() => this.advance(), ok ? 380 : 720);
    },

    advance() {
      this.index += 1;
      if (this.index >= this.total) {
        this.finish();
        return;
      }
      this.nextQuestion();
    },

    finish() {
      clearInterval(this.timer);
      this.elapsed = Date.now() - this.startedAt;
      this.passed = this.correct >= this.level.pass;
      this.stars = starCount({
        correct: this.correct,
        total: this.total,
        timeMs: this.elapsed,
        pass: this.level.pass,
        threeStarMs: this.level.threeStarMs,
      });
      recordRun({
        gameId: "math",
        modeId: this.modeId,
        levelId: this.levelId,
        correct: this.correct,
        total: this.total,
        timeMs: this.elapsed,
        passed: this.passed,
        stars: this.stars,
      });
      this.showResult = true;
    },

    keys() {
      return ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    },
  }));
});
