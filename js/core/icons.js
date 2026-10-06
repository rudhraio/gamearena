const svg = (inner) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">${inner}</svg>`;

export const icon = {
  back: svg('<path d="M14 5L7 12l7 7"/><path d="M7 12h13"/>'),
  home: svg('<rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/>'),
  math: svg('<rect x="4" y="4" width="16" height="16"/><path d="M8 12h8M12 8v8"/>'),
  zip: svg('<rect x="4" y="4" width="16" height="16"/><path d="M7 7h4v4H9v6h8"/>'),
  riddle: svg('<circle cx="12" cy="9" r="4"/><path d="M10 13.5V16h4v-2.5"/><path d="M12 18v2"/>'),
  sudoku: svg('<rect x="3" y="3" width="18" height="18"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>'),
  memory: svg('<rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/>'),
  sound: svg('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9.5c1.2.8 1.2 4.2 0 5"/>'),
  play: svg('<rect x="4" y="4" width="16" height="16"/><path d="M10 8l6 4-6 4z"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
};

export function crumbParts(raw) {
  return (raw || "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const i = part.indexOf(":");
      if (i === -1) return { label: part, href: "" };
      return { label: part.slice(0, i), href: part.slice(i + 1) };
    });
}

export function navMarkup({ back = "", crumbs = "", current = "", sound = false } = {}) {
  const trail = crumbParts(crumbs);
  if (current) trail.push({ label: current, href: "" });

  const crumbHtml = trail
    .map((item, index) => {
      const last = index === trail.length - 1;
      const node = item.href && !last
        ? `<a href="${item.href}">${item.label}</a>`
        : `<span class="is-here">${item.label}</span>`;
      const sep = last ? "" : `<span class="crumb-sep" aria-hidden="true">/</span>`;
      return node + sep;
    })
    .join("");

  const backBtn = back
    ? `<a class="icon-btn" href="${back}">${icon.back}<span>Back</span></a>`
    : `<a class="brand" href="/"><span class="brand-mark">GA</span><span class="wordmark">Game Arena</span></a>`;

  const homeBtn = back
    ? `<a class="icon-btn" href="/">${icon.home}<span>Hub</span></a>`
    : "";

  const soundBtn = sound
    ? `<button class="icon-btn" type="button" data-sound>${icon.sound}<span>Sound</span></button>`
    : "";

  return `
    <div class="nav-left">
      ${backBtn}
      <nav class="crumbs${crumbHtml ? "" : " hidden"}" aria-label="You are here">${crumbHtml}</nav>
    </div>
    <div class="nav-right">
      ${soundBtn}
      ${homeBtn}
    </div>
  `;
}
