let initialized = false;

export function initPwa({ barSelector = "#install-bar" } = {}) {
  if (initialized) return;
  initialized = true;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.warn("Offline installation is unavailable:", error);
    });
  }

  const bar = document.querySelector(barSelector);
  if (!bar) return;
  const installed = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const dismissed = (() => {
    try { return JSON.parse(localStorage.getItem("gamearena.v1") || "{}")?.settings?.installDismissed; }
    catch { return false; }
  })();
  const message = bar.querySelector("[data-install-message]");
  const install = bar.querySelector("[data-install]");
  let deferred = null;

  if (iOS && !installed() && !dismissed) {
    if (message) message.textContent = "On iPhone or iPad: open in Safari, tap Share, then Add to Home Screen.";
    if (install) install.classList.add("hidden");
    bar.classList.remove("hidden");
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event;
    if (!dismissed && !installed()) bar.classList.remove("hidden");
  });

  install?.addEventListener("click", async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    bar.classList.add("hidden");
  });

  bar.querySelector("[data-dismiss]")?.addEventListener("click", async () => {
    bar.classList.add("hidden");
    const { setSetting } = await import("./storage.js");
    setSetting("installDismissed", true);
  });

  window.addEventListener("appinstalled", () => bar.classList.add("hidden"));
  if (installed()) bar.classList.add("hidden");
}

export function initSoundToggle(button) {
  if (!button) return;
  import("./storage.js").then(({ loadState, setSetting }) => {
    const sync = () => {
      const on = loadState().settings.sound;
      button.dataset.on = on ? "1" : "0";
      const label = button.querySelector("span");
      if (label) label.textContent = on ? "On" : "Off";
      button.setAttribute("aria-label", on ? "Sound on" : "Sound off");
    };
    sync();
    button.addEventListener("click", () => {
      setSetting("sound", !loadState().settings.sound);
      sync();
    });
  });
}

let audioCtx;
export async function beep(kind = "ok") {
  const { loadState } = await import("./storage.js");
  if (!loadState().settings.sound) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = kind === "ok" ? 620 : kind === "tap" ? 220 : 140;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.08);
    osc.stop(audioCtx.currentTime + 0.09);
  } catch {
    // Audio is optional.
  }
}
