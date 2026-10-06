// Run with a local server on port 8765 and Chrome DevTools on port 9222.
import { writeFile } from "node:fs/promises";
const tabs = await fetch("http://127.0.0.1:9222/json/list").then((response) => response.json());
const tab = tabs.find((item) => item.type === "page");
if (!tab) throw new Error("No Chrome page available");
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let nextId = 0;
const pending = new Map();
const listeners = new Map();
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const task = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) task.reject(new Error(message.error.message));
    else task.resolve(message.result);
  } else {
    if (message.method === "Runtime.exceptionThrown") console.error("page error", message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === "Network.loadingFailed") console.error("request failed", message.params.errorText);
    if (message.method === "Page.javascriptDialogOpening") send("Page.handleJavaScriptDialog", { accept: true });
    const queue = listeners.get(message.method);
    if (queue?.length) queue.shift()(message.params);
  }
});
function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
function once(event) {
  return new Promise((resolve) => {
    const queue = listeners.get(event) || [];
    queue.push(resolve);
    listeners.set(event, queue);
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
async function navigate(path) {
  const loaded = once("Page.loadEventFired");
  await send("Page.navigate", { url: `http://127.0.0.1:8765${path}` });
  await loaded;
  await new Promise((resolve) => setTimeout(resolve, 250));
  return evaluate("({title: document.title, ready: document.readyState, cards: document.querySelectorAll('.card-link').length, nav: Boolean(document.querySelector('[data-nav] a')), board: Boolean(document.querySelector('.zip-board, .sudoku-board, .memory-board')), alpine: Boolean(window.Alpine)})");
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
const policy = await navigate("/").then(() => evaluate("fetch('/').then((response) => response.headers.get('Content-Security-Policy'))"));
if (!policy?.includes("frame-ancestors 'none'")) throw new Error("Pages security policy was not served");
for (const path of ["/", "/math/", "/levels/?mode=add", "/play/?mode=add&level=1", "/zip/", "/zip/play/?level=1&difficulty=high", "/sudoku/", "/memory/"]) {
  const result = await navigate(path);
  console.log(path, JSON.stringify(result));
  if (!result.nav) throw new Error(`Navigation did not render at ${path}`);
  if (path === "/" && result.cards < 5) throw new Error("Hub games did not render");
  if (path === "/") {
    const brand = await evaluate("document.querySelector('.brand-mark').textContent");
    if (brand !== "GA") throw new Error("Navigation brand changed unexpectedly");
  }
  if (path.startsWith("/play/") || path.startsWith("/zip/play/")) {
    if (!result.alpine) throw new Error(`Alpine did not initialize at ${path}`);
    await evaluate("document.querySelector('.overlay button.btn-fill').click()");
    await pause(100);
    if (path.startsWith("/play/")) {
      const keys = await evaluate("document.querySelectorAll('.keypad .key').length");
      if (keys !== 13) throw new Error("Math keypad did not start");
    } else {
      const cells = await evaluate("document.querySelectorAll('.zip-cell').length");
      const walls = await evaluate("document.querySelectorAll('.zip-wall').length");
      if (cells !== 25 || walls !== 0) throw new Error("High Zip board did not start correctly");
    }
  }
  if (path === "/sudoku/") {
    await evaluate("document.querySelector('[data-difficulty=medium]').click()");
    await pause(100);
    const clues = await evaluate("document.querySelectorAll('.sudoku-cell.is-given').length");
    if (clues < 30 || clues > 40) throw new Error("Sudoku did not generate a medium puzzle");
  }
  if (path === "/memory/") {
    await evaluate("document.querySelector('#memory-start').click()");
    const started = await evaluate("document.querySelector('#memory-round').textContent");
    if (!started.includes("01")) throw new Error("Memory did not start");
  }
}
let workerReady = [];
for (let attempt = 0; attempt < 20; attempt += 1) {
  workerReady = await evaluate("navigator.serviceWorker.ready.then(() => caches.keys())");
  if (workerReady.includes("gamearena-v13")) break;
  await pause(250);
}
if (!workerReady.includes("gamearena-v13")) throw new Error(`Service worker did not cache the app: ${workerReady}`);
await send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
for (const path of ["/", "/play/?mode=add&level=1", "/zip/play/?level=1&difficulty=high", "/sudoku/", "/memory/"]) {
  const result = await navigate(path);
  if (!result.nav) throw new Error(`Offline navigation failed at ${path}`);
  console.log("offline", path, JSON.stringify(result));
}
await send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
await send("Network.setUserAgentOverride", {
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  platform: "iPhone",
});
await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 3, mobile: true });
await navigate("/");
const iosInstall = await evaluate("({message: document.querySelector('[data-install-message]').textContent, visible: !document.querySelector('#install-bar').classList.contains('hidden'), buttonHidden: document.querySelector('[data-install]').classList.contains('hidden')})");
if (!iosInstall.visible || !iosInstall.buttonHidden || !iosInstall.message.includes("Add to Home Screen")) throw new Error("iOS install guidance did not appear");
console.log("iOS install", JSON.stringify(iosInstall));
const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
await writeFile("/private/tmp/gamearena-ios-hub.png", Buffer.from(screenshot.data, "base64"));
await navigate("/zip/play/?level=1&difficulty=high");
await evaluate("document.querySelector('.overlay button.btn-fill').click()");
await pause(100);
const zipWidth = await evaluate("({viewport: innerWidth, page: document.documentElement.scrollWidth, board: document.querySelector('.zip-board').getBoundingClientRect().width})");
if (zipWidth.page > zipWidth.viewport + 2 || zipWidth.board > zipWidth.viewport) throw new Error("Zip overflows the iPhone viewport");
console.log("iOS Zip layout", JSON.stringify(zipWidth));
await navigate("/sudoku/");
const sudokuWidth = await evaluate("({viewport: innerWidth, page: document.documentElement.scrollWidth, board: document.querySelector('.sudoku-board').getBoundingClientRect().width})");
if (sudokuWidth.page > sudokuWidth.viewport + 2 || sudokuWidth.board > sudokuWidth.viewport) throw new Error("Sudoku overflows the iPhone viewport");
console.log("iOS Sudoku layout", JSON.stringify(sudokuWidth));
const sudokuShot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
await writeFile("/private/tmp/gamearena-ios-sudoku.png", Buffer.from(sudokuShot.data, "base64"));

const savedState = await evaluate("localStorage.getItem('gamearena.v1')");
const savedDraft = await evaluate("localStorage.getItem('gamearena.sudoku.draft.v1')");
const attack = '<img src=x onerror="window.__xss=1">';
const poisoned = {
  stats: { played: 1 },
  games: {
    math: { add: { 1: { completed: true, bestCorrect: attack } } },
    zip: { zip: { 1: { completed: true, bestHints: attack, lastWaypoints: attack } } },
    memory: { sequence: { 1: { bestCorrect: attack } } },
  },
};
await evaluate(`localStorage.setItem('gamearena.v1', JSON.stringify(${JSON.stringify(poisoned)}))`);
for (const path of ["/", "/levels/?mode=add", "/zip/"]) {
  await navigate(path);
  const escapedScores = await evaluate("!document.querySelector('img') && !window.__xss");
  if (!escapedScores) throw new Error(`Saved progress was inserted as executable HTML at ${path}`);
}
if (savedDraft) {
  const draft = JSON.parse(savedDraft);
  const empty = draft.puzzle.findIndex((value) => value === 0);
  if (empty >= 0) {
    draft.notes[empty] = attack;
    await evaluate(`localStorage.setItem('gamearena.sudoku.draft.v1', JSON.stringify(${JSON.stringify(draft)}))`);
    await navigate("/sudoku/");
    const escapedDraft = await evaluate("!document.querySelector('#sudoku-board img') && !window.__xss");
    if (!escapedDraft) throw new Error("Saved Sudoku draft was inserted as executable HTML");
  }
}
if (savedState === null) await evaluate("localStorage.removeItem('gamearena.v1')");
else await evaluate(`localStorage.setItem('gamearena.v1', ${JSON.stringify(savedState)})`);
if (savedDraft) await evaluate(`localStorage.setItem('gamearena.sudoku.draft.v1', ${JSON.stringify(savedDraft)})`);
else await evaluate("localStorage.removeItem('gamearena.sudoku.draft.v1')");
console.log("stored data injection", "blocked");
socket.close();
