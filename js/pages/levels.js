import { getMode, qs, routes } from "../core/registry.js";
import { getModeProgress, isLevelUnlocked, safeInt } from "../core/storage.js";
import { getMathLevels } from "../games/math.js";
import { mountChrome } from "../core/shell.js";

function starsHtml(count) {
  return [1, 2, 3]
    .map((n) => `<span class="star ${n <= count ? "is-on" : ""}"></span>`)
    .join("");
}

function render() {
  const modeId = qs("mode", "add");
  const mode = getMode(modeId);
  if (!mode) {
    window.location.replace(routes.math);
    return;
  }

  const nav = document.querySelector("[data-nav]");
  if (nav) nav.dataset.current = mode.title;
  mountChrome();

  document.title = `${mode.title} · GAME ARENA`;
  const title = document.getElementById("mode-title");
  const sub = document.getElementById("mode-sub");
  const crumb = document.getElementById("mode-crumb");
  if (title) title.textContent = mode.title;
  if (sub) sub.textContent = mode.copy;
  if (crumb) crumb.textContent = `MATH / ${mode.title}`;

  const levels = getMathLevels(modeId);
  const progress = getModeProgress("math", modeId);
  const grid = document.getElementById("level-grid");
  if (!grid) return;

  grid.innerHTML = levels
    .map((level) => {
      const row = progress[String(level.id)] || {};
      const unlocked = isLevelUnlocked("math", modeId, level.id);
      const href = routes.play(modeId, level.id);
      const cls = unlocked ? "card-link" : "card-link is-locked";
      return `
        <a class="${cls}" href="${unlocked ? href : "#"}" aria-disabled="${unlocked ? "false" : "true"}">
          <div class="cluster-between">
            <p class="kicker">LVL ${String(level.id).padStart(2, "0")}</p>
            <div class="stars">${starsHtml(row.stars || 0)}</div>
          </div>
          <h2 class="display-sm">${level.name}</h2>
          <p class="mono body-mute">${level.desc}</p>
          <div class="cluster-between">
            <span class="chip ${unlocked ? "chip-fill" : ""}">${unlocked ? (row.completed ? "cleared" : "open") : "locked"}</span>
          <span class="mono">${row.bestCorrect ? `${safeInt(row.bestCorrect, 10)}/10` : "—/10"}</span>
          </div>
        </a>
      `;
    })
    .join("");
}

render();
