const KEY = "gamearena.v1";

const EMPTY = {
  version: 1,
  stats: {
    played: 0,
    correct: 0,
    questions: 0,
    streakDays: 0,
    bestStreak: 0,
    lastPlayDate: null,
  },
  games: {},
  settings: {
    sound: true,
    installDismissed: false,
  },
};

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStamp() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(EMPTY);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(EMPTY),
      ...parsed,
      stats: { ...EMPTY.stats, ...(parsed.stats || {}) },
      settings: { ...EMPTY.settings, ...(parsed.settings || {}) },
      games: parsed.games || {},
    };
  } catch {
    return structuredClone(EMPTY);
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
  return state;
}

export function updateState(mutator) {
  const state = loadState();
  mutator(state);
  return saveState(state);
}

export function getModeProgress(gameId, modeId) {
  const state = loadState();
  return state.games?.[gameId]?.[modeId] || {};
}

export function isLevelUnlocked(gameId, modeId, levelId) {
  if (levelId <= 1) return true;
  const progress = getModeProgress(gameId, modeId);
  const prev = progress[String(levelId - 1)];
  return Boolean(prev?.completed);
}

export function recordRun({ gameId, modeId, levelId, correct, total, timeMs, passed, stars }) {
  return updateState((state) => {
    if (!state.games[gameId]) state.games[gameId] = {};
    if (!state.games[gameId][modeId]) state.games[gameId][modeId] = {};

    const key = String(levelId);
    const prev = state.games[gameId][modeId][key] || {
      stars: 0,
      bestCorrect: 0,
      bestTimeMs: null,
      attempts: 0,
      completed: false,
    };

    state.games[gameId][modeId][key] = {
      stars: Math.max(prev.stars, stars),
      bestCorrect: Math.max(prev.bestCorrect, correct),
      bestTimeMs:
        prev.bestTimeMs == null ? timeMs : Math.min(prev.bestTimeMs, timeMs),
      attempts: prev.attempts + 1,
      completed: prev.completed || passed,
    };

    state.stats.played += 1;
    state.stats.correct += correct;
    state.stats.questions += total;

    const today = todayStamp();
    if (state.stats.lastPlayDate === today) {
      // same day, keep streak
    } else if (state.stats.lastPlayDate === yesterdayStamp()) {
      state.stats.streakDays += 1;
    } else {
      state.stats.streakDays = 1;
    }
    state.stats.lastPlayDate = today;
    state.stats.bestStreak = Math.max(state.stats.bestStreak, state.stats.streakDays);
  });
}

export function accuracyPct() {
  const { correct, questions } = loadState().stats;
  if (!questions) return 0;
  return Math.round((correct / questions) * 100);
}

export function modeCompletion(gameId, modeId, levelCount) {
  const progress = getModeProgress(gameId, modeId);
  let done = 0;
  let stars = 0;
  for (let i = 1; i <= levelCount; i += 1) {
    const row = progress[String(i)];
    if (row?.completed) done += 1;
    stars += row?.stars || 0;
  }
  return { done, stars, total: levelCount };
}

export function setSetting(name, value) {
  return updateState((state) => {
    state.settings[name] = value;
  });
}
