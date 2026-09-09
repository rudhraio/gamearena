import { MATH_MODES, routes } from "../core/registry.js";
import { modeCompletion } from "../core/storage.js";
import { getMathLevels } from "../games/math.js";
import { mountChrome } from "../core/shell.js";

function render() {
  mountChrome();
  const grid = document.getElementById("mode-grid");
  if (!grid) return;

  grid.innerHTML = MATH_MODES.map((mode, index) => {
    const levels = getMathLevels(mode.id);
    const { done, stars, total } = modeCompletion("math", mode.id, levels.length);
    return `
      <a class="card-link" href="${routes.levels(mode.id)}">
        <div class="cluster-between">
          <p class="kicker">${String(index + 1).padStart(2, "0")} / MODE</p>
          <span class="mode-symbol">${mode.symbol}</span>
        </div>
        <h2 class="display-sm">${mode.title}</h2>
        <p class="body-mute">${mode.copy}</p>
        <div class="cluster-between">
          <div class="stack-tight">
            <p class="kicker">Cleared</p>
            <p class="mono">${String(done).padStart(2, "0")} / ${String(total).padStart(2, "0")}</p>
          </div>
          <div class="stack-tight align-end">
            <p class="kicker">Stars</p>
            <p class="mono">${String(stars).padStart(2, "0")} / ${String(total * 3).padStart(2, "0")}</p>
          </div>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${Math.round((done / total) * 100)}%"></div>
        </div>
      </a>
    `;
  }).join("");
}

render();
