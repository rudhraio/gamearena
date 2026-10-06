import { GAMES, MATH_MODES, routes } from "../core/registry.js";
import { accuracyPct, isLevelUnlocked, loadState, modeCompletion, safeInt } from "../core/storage.js";
import { getMathLevels } from "../games/math.js";
import { getZipLevels, ZIP_DIFFICULTIES, zipModeId } from "../games/zip.js";
import { mountChrome } from "../core/shell.js";
import { icon } from "../core/icons.js";

function dailySeed() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return Number(stamp);
}

function highestOpen(modeId) {
  const levels = getMathLevels(modeId);
  let open = 1;
  for (const level of levels) {
    if (isLevelUnlocked("math", modeId, level.id)) open = level.id;
    else break;
  }
  return open;
}

function dailyBrief() {
  const seed = dailySeed();
  const mode = MATH_MODES[seed % MATH_MODES.length];
  const open = highestOpen(mode.id);
  const level = Math.min(open, (seed % open) + 1);
  return { mode, level, stamp: new Date().toISOString().slice(0, 10) };
}

function renderHub() {
  mountChrome();
  const state = loadState();
  const acc = accuracyPct();
  const mathLevels = getMathLevels("add").length * MATH_MODES.length;
  let mathDone = 0;
  MATH_MODES.forEach((mode) => {
    mathDone += modeCompletion("math", mode.id, getMathLevels(mode.id).length).done;
  });
  const zipLevels = getZipLevels().length;
  const zipTotal = zipLevels * ZIP_DIFFICULTIES.length;
  const zipDone = ZIP_DIFFICULTIES.reduce((sum, difficulty) =>
    sum + modeCompletion("zip", zipModeId(difficulty.id), zipLevels).done, 0);
  const glyphs = { math: icon.math, zip: icon.zip, sudoku: icon.sudoku, memory: icon.memory, riddles: icon.riddle };

  const gameScore = (game) => {
    if (game.id === "math") return `${String(mathDone).padStart(2, "0")}/${mathLevels}`;
    if (game.id === "zip") return `${String(zipDone).padStart(2, "0")}/${String(zipTotal).padStart(2, "0")}`;
    if (game.id === "sudoku") return `${Object.values(state.games.sudoku || {}).reduce((sum, mode) => sum + (mode?.["1"]?.completed === true ? 1 : 0), 0)}/3`;
    if (game.id === "memory") return `${safeInt(state.games.memory?.sequence?.["1"]?.bestCorrect, 8)}/8`;
    return "000/000";
  };

  const bind = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  bind("stat-played", String(state.stats.played).padStart(2, "0"));
  bind("stat-acc", `${acc}%`);
  bind("stat-streak", String(state.stats.streakDays).padStart(2, "0"));
  bind("math-progress", `${String(mathDone).padStart(2, "0")} / ${mathLevels}`);

  const grid = document.getElementById("game-grid");
  if (grid) {
    grid.innerHTML = GAMES.map((game) => `
      <a class="card-link" href="${game.href}">
        <div class="cluster-between">
          <span class="card-glyph">${glyphs[game.id] || icon.riddle}</span>
          <span class="chip ${game.status === "live" ? "chip-fill" : ""}">${game.status}</span>
        </div>
        <h2 class="display">${game.title}</h2>
        <div class="stack">
          <p class="lede">${game.tagline}</p>
          <p class="body-mute">${game.blurb}</p>
        </div>
        <div class="cluster-between">
          <span class="mono">${game.status === "live" ? `Open ${game.title.toLowerCase()} →` : "Coming soon"}</span>
          <span class="mono">${gameScore(game)}</span>
        </div>
      </a>
    `).join("");
  }

  const daily = dailyBrief();
  const dailyEl = document.getElementById("daily-target");
  if (dailyEl) {
    dailyEl.innerHTML = `
      <div class="stack-lg">
        <p class="kicker">Daily vector · ${daily.stamp}</p>
        <h3 class="display-sm">${daily.mode.title} / ${String(daily.level).padStart(2, "0")}</h3>
        <p class="body-mute">${daily.mode.copy}</p>
        <a class="btn btn-fill" href="${routes.play(daily.mode.id, daily.level)}">Launch briefing</a>
      </div>
    `;
  }
}

renderHub();
