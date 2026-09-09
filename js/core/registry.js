// Add a game: push into GAMES, then add a page + engine under js/games/.
// Math modes live in MATH_MODES so new operations plug into the same cockpit.

export const ARENA = {
  name: "GAME ARENA",
  short: "GA",
  tagline: "MATH. ZIP. RIDDLES.",
};

export const routes = {
  hub: "/",
  math: "/math/",
  zip: "/zip/",
  riddles: "/riddles/",
  offline: "/offline/",
  levels(mode) {
    return `/levels/?mode=${encodeURIComponent(mode)}`;
  },
  play(mode, level) {
    return `/play/?mode=${encodeURIComponent(mode)}&level=${level}`;
  },
  zipPlay(level) {
    return `/zip/play/?level=${level}`;
  },
};

export const GAMES = [
  {
    id: "math",
    title: "MATH",
    kicker: "01 / LIVE",
    tagline: "Clean numbers. No mercy.",
    blurb: "Addition through division, built like a time attack. Digits scale with every stage.",
    href: routes.math,
    status: "live",
    accent: "precision",
  },
  {
    id: "zip",
    title: "ZIP",
    kicker: "02 / LIVE",
    tagline: "One path. Every cell.",
    blurb: "Connect the numbers in order and fill the grid. A fresh riddle every run.",
    href: routes.zip,
    status: "live",
    accent: "path",
  },
  {
    id: "riddles",
    title: "RIDDLES",
    kicker: "03 / SOON",
    tagline: "Think sideways.",
    blurb: "Logic locks, word traps, and pattern riddles. Architecture is ready. Content lands next.",
    href: routes.riddles,
    status: "soon",
    accent: "cipher",
  },
];

export const MATH_MODES = [
  {
    id: "add",
    title: "ADD",
    symbol: "+",
    verb: "Addition",
    copy: "Stack values. Carry when it counts.",
  },
  {
    id: "sub",
    title: "SUB",
    symbol: "−",
    verb: "Subtraction",
    copy: "Hold the line. Never go negative.",
  },
  {
    id: "mul",
    title: "MUL",
    symbol: "×",
    verb: "Multiplication",
    copy: "Torque up the digits.",
  },
  {
    id: "div",
    title: "DIV",
    symbol: "÷",
    verb: "Division",
    copy: "Exact cuts only. No remainder.",
  },
  {
    id: "mix",
    title: "MIX",
    symbol: "±",
    verb: "Mixed ops",
    copy: "All four operations, same cockpit.",
  },
];

export function getGame(id) {
  return GAMES.find((g) => g.id === id) || null;
}

export function getMode(id) {
  return MATH_MODES.find((m) => m.id === id) || null;
}

export function qs(name, fallback = "") {
  const value = new URLSearchParams(window.location.search).get(name);
  return value == null || value === "" ? fallback : value;
}
