export function initPwa({ barSelector = "#install-bar" } = {}) {
  const bar = document.querySelector(barSelector);
  if (!bar) return;

  const dismissed = (() => {
    try {
      return JSON.parse(localStorage.getItem("gamearena.v1") || "{}")?.settings?.installDismissed;
    } catch {
      return false;
    }
  })();

  let deferred = null;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event;
    if (!dismissed) bar.classList.remove("hidden");
  });

  bar.querySelector("[data-install]")?.addEventListener("click", async () => {
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

  window.addEventListener("appinstalled", () => {
    bar.classList.add("hidden");
  });

  if (window.matchMedia("(display-mode: standalone)").matches) {
    bar.classList.add("hidden");
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }
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
      const next = !(loadState().settings.sound);
      setSetting("sound", next);
      sync();
    });
  });
}

let audioCtx;
function ctx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

export async function beep(kind = "ok") {
  const { loadState } = await import("./storage.js");
  if (!loadState().settings.sound) return;
  try {
    const ac = ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "square";
    osc.frequency.value = kind === "ok" ? 620 : kind === "tap" ? 220 : 140;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.08);
    osc.stop(ac.currentTime + 0.09);
  } catch {
    // audio optional
  }
}
