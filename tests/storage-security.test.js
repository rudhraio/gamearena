import test from "node:test";
import assert from "node:assert/strict";
import { getModeProgress, loadState, recordRun, safeInt } from "../js/core/storage.js";

test("saved progress is treated as data and malformed values do not crash runs", () => {
  const attack = '<img src=x onerror="window.__xss=1">';
  let data = JSON.stringify({
    stats: { played: attack, questions: "5", streakDays: -9 },
    games: { zip: { zip: { 1: { completed: true, stars: attack, bestHints: attack, runs: attack } } } },
    settings: { sound: attack, installDismissed: "true" },
  });
  globalThis.localStorage = {
    getItem: () => data,
    setItem: (_, value) => { data = value; },
  };
  const state = loadState();
  assert.equal(state.stats.played, 0);
  assert.equal(state.stats.questions, 5);
  assert.equal(state.stats.streakDays, 0);
  assert.equal(state.settings.sound, true);
  assert.equal(state.settings.installDismissed, false);
  assert.equal(safeInt(attack, 8), 0);
  assert.equal(getModeProgress("zip", "zip")["1"].completed, true);
  assert.doesNotThrow(() => recordRun({
    gameId: "zip", modeId: "zip", levelId: 1, correct: 1,
    total: 1, timeMs: 100, passed: true, stars: 1,
    extra: { hints: 0, waypoints: 8 },
  }));
});
