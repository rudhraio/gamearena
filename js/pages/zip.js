import { routes } from "../core/registry.js";
import { getModeProgress, isLevelUnlocked } from "../core/storage.js";
import { getZipLevels } from "../games/zip.js";
import { mountChrome } from "../core/shell.js";

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatTime(ms) {
  if (ms == null) return "—";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${pad(m)}:${pad(s % 60)}`;
}

function starsHtml(count) {
  return [1, 2, 3]
    .map((n) => `<span class="star ${n <= count ? "is-on" : ""}"></span>`)
    .join("");
}

function render() {
  mountChrome();
  const levels = getZipLevels();
  const progress = getModeProgress("zip", "zip");
  const grid = document.getElementById("level-grid");
  if (!grid) return;

  grid.innerHTML = levels
    .map((level) => {
      const row = progress[String(level.id)] || {};
      const unlocked = isLevelUnlocked("zip", "zip", level.id);
      const href = routes.zipPlay(level.id);
      const cls = unlocked ? "card-link" : "card-link is-locked";
      const hints = row.bestHints != null ? pad(row.bestHints) : "—";
      const links = row.lastWaypoints ? pad(row.lastWaypoints) : "—";
      return `
        <a class="${cls}" href="${unlocked ? href : "#"}" aria-disabled="${unlocked ? "false" : "true"}">
          <div class="cluster-between">
            <p class="kicker">LVL ${pad(level.id)}</p>
            <div class="stars">${starsHtml(row.stars || 0)}</div>
          </div>
          <h2 class="display-sm">${level.name}</h2>
          <p class="mono body-mute">${level.size}×${level.size} grid</p>
          <div class="cluster-between">
            <span class="chip ${unlocked ? "chip-fill" : ""}">${unlocked ? (row.completed ? "cleared" : "open") : "locked"}</span>
            <span class="mono">${formatTime(row.bestTimeMs)}</span>
          </div>
          <p class="mono body-mute">Hints ${hints} · Links ${links}</p>
        </a>
      `;
    })
    .join("");
}

render();
