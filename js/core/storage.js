const KEY = "gamearena.v1";
let memoryState = null;
let storageFailed = false;

export function safeInt(value, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(0, Math.floor(number))) : 0;
}

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

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
    const raw = storageFailed ? null : localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : memoryState;
    if (!parsed) return JSON.parse(JSON.stringify(EMPTY));
    const data = record(parsed);
    const stats = record(data.stats);
    const settings = record(data.settings);
    return {
      ...JSON.parse(JSON.stringify(EMPTY)),
      version: 1,
      stats: {
        played: safeInt(stats.played),
        correct: safeInt(stats.correct),
        questions: safeInt(stats.questions),
        streakDays: safeInt(stats.streakDays),
        bestStreak: safeInt(stats.bestStreak),
        lastPlayDate: /^\d{4}-\d{2}-\d{2}$/.test(stats.lastPlayDate) ? stats.lastPlayDate : null,
      },
      settings: {
        sound: typeof settings.sound === "boolean" ? settings.sound : EMPTY.settings.sound,
        installDismissed: settings.installDismissed === true,
      },
      games: record(data.games),
    };
  } catch {
    return memoryState ? JSON.parse(JSON.stringify(memoryState)) : JSON.parse(JSON.stringify(EMPTY));
  }
}

export function saveState(state) {
  memoryState = state;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    storageFailed = true;
  }
  return state;
}

export function updateState(mutator) {
  const state = loadState();
  mutator(state);
  return saveState(state);
}

export function getModeProgress(gameId, modeId) {
  const state = loadState();
  return record(state.games?.[gameId]?.[modeId]);
}

export function isLevelUnlocked(gameId, modeId, levelId) {
  if (levelId <= 1) return true;
  const progress = getModeProgress(gameId, modeId);
  const prev = progress[String(levelId - 1)];
  return Boolean(prev?.completed);
}

export function recordRun({
  gameId,
  modeId,
  levelId,
  correct,
  total,
  timeMs,
  passed,
  stars,
  extra = null,
}) {
  return updateState((state) => {
    state.games[gameId] = record(state.games[gameId]);
    state.games[gameId][modeId] = record(state.games[gameId][modeId]);

    const key = String(levelId);
    const prev = record(state.games[gameId][modeId][key]);
    const previous = Object.keys(prev).length ? prev : {
      stars: 0,
      bestCorrect: 0,
      bestTimeMs: null,
      attempts: 0,
      completed: false,
    };

    const next = {
      stars: Math.max(safeInt(previous.stars, 3), stars),
      bestCorrect: Math.max(safeInt(previous.bestCorrect), correct),
      bestTimeMs:
        previous.bestTimeMs == null ? timeMs : Math.min(safeInt(previous.bestTimeMs), timeMs),
      attempts: safeInt(previous.attempts) + 1,
      completed: previous.completed === true || passed,
    };

    if (extra) {
      const hints = Number(extra.hints) || 0;
      const waypoints = Number(extra.waypoints) || 0;
      next.bestHints =
        previous.bestHints == null ? hints : Math.min(safeInt(previous.bestHints), hints);
      next.lastHints = hints;
      next.lastWaypoints = waypoints;
      next.runs = [...(Array.isArray(previous.runs) ? previous.runs : []), { timeMs, hints, waypoints, at: Date.now() }].slice(-40);
    }

    state.games[gameId][modeId][key] = next;

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
    stars += safeInt(row?.stars, 3);
  }
  return { done, stars, total: levelCount };
}

export function setSetting(name, value) {
  return updateState((state) => {
    state.settings[name] = value;
  });
}
