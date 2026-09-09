import { ARENA } from "./registry.js";
import { initPwa, initSoundToggle } from "./pwa.js";
import { navMarkup } from "./icons.js";

export function paintNav(root = document) {
  root.querySelectorAll("[data-nav]").forEach((el) => {
    el.innerHTML = navMarkup({
      back: el.dataset.back || "",
      crumbs: el.dataset.crumbs || "",
      current: el.dataset.current || "",
      sound: el.dataset.sound === "1",
    });
  });
}

export function mountChrome() {
  paintNav();
  const year = new Date().getFullYear();
  document.querySelectorAll("[data-brand]").forEach((el) => {
    el.textContent = ARENA.short;
  });
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(year);
  });
  initPwa();
  initSoundToggle(document.querySelector("[data-sound]"));
}
