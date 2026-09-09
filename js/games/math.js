const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const nDigits = (digits) => {
  if (digits <= 1) return rand(1, 9);
  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;
  return rand(min, max);
};

function pair(aDigits, bDigits, { ensureAGteB = false } = {}) {
  let a = nDigits(aDigits);
  let b = nDigits(bDigits);
  if (ensureAGteB && a < b) [a, b] = [b, a];
  if (ensureAGteB && a === b) {
    if (b > 1) b -= 1;
    else a += 1;
  }
  return [a, b];
}

function makeAdd(aDigits, bDigits) {
  const [a, b] = pair(aDigits, bDigits);
  return { a, b, op: "+", symbol: "+", answer: a + b };
}

function makeSub(aDigits, bDigits) {
  const [a, b] = pair(aDigits, bDigits, { ensureAGteB: true });
  return { a, b, op: "-", symbol: "−", answer: a - b };
}

function makeMul(aDigits, bDigits) {
  const a = nDigits(aDigits);
  const b = nDigits(bDigits);
  return { a, b, op: "*", symbol: "×", answer: a * b };
}

function makeDiv(aDigits, bDigits) {
  const divisorDigits = Math.min(bDigits, aDigits);
  const b = nDigits(divisorDigits);
  const minA = aDigits <= 1 ? 2 : 10 ** (aDigits - 1);
  const maxA = 10 ** aDigits - 1;
  const minQ = Math.max(2, Math.ceil(minA / b));
  const maxQ = Math.max(minQ, Math.floor(maxA / b));
  if (maxQ < 2) {
    const q = rand(2, 9);
    const d = rand(2, 9);
    return { a: q * d, b: d, op: "/", symbol: "÷", answer: q };
  }
  const q = rand(minQ, maxQ);
  return { a: b * q, b, op: "/", symbol: "÷", answer: q };
}

const GENERATORS = {
  add: makeAdd,
  sub: makeSub,
  mul: makeMul,
  div: makeDiv,
};

const LEVEL_BLUEPRINT = [
  { id: 1, code: "SPARK", digits: [1, 1], questions: 10, pass: 8, threeStarMs: 50000 },
  { id: 2, code: "PULSE", digits: [2, 1], questions: 10, pass: 8, threeStarMs: 60000 },
  { id: 3, code: "TORQUE", digits: [2, 2], questions: 10, pass: 8, threeStarMs: 75000 },
  { id: 4, code: "GRID", digits: [3, 2], questions: 10, pass: 8, threeStarMs: 90000 },
  { id: 5, code: "VECTOR", digits: [3, 3], questions: 10, pass: 8, threeStarMs: 110000 },
  { id: 6, code: "CARBON", digits: [4, 2], questions: 10, pass: 8, threeStarMs: 120000 },
  { id: 7, code: "APEX", digits: [4, 3], questions: 10, pass: 8, threeStarMs: 140000 },
  { id: 8, code: "NITRO", digits: [4, 4], questions: 10, pass: 8, threeStarMs: 160000 },
];

const MUL_LEVELS = [
  { id: 1, code: "SPARK", digits: [1, 1], questions: 10, pass: 8, threeStarMs: 45000 },
  { id: 2, code: "PULSE", digits: [2, 1], questions: 10, pass: 8, threeStarMs: 60000 },
  { id: 3, code: "TORQUE", digits: [2, 1], questions: 10, pass: 8, threeStarMs: 70000 },
  { id: 4, code: "GRID", digits: [3, 1], questions: 10, pass: 8, threeStarMs: 80000 },
  { id: 5, code: "VECTOR", digits: [2, 2], questions: 10, pass: 8, threeStarMs: 110000 },
  { id: 6, code: "CARBON", digits: [3, 1], questions: 10, pass: 8, threeStarMs: 100000 },
  { id: 7, code: "APEX", digits: [3, 2], questions: 10, pass: 8, threeStarMs: 140000 },
  { id: 8, code: "NITRO", digits: [3, 2], questions: 10, pass: 8, threeStarMs: 150000 },
];

const DIV_LEVELS = [
  { id: 1, code: "SPARK", digits: [1, 1], questions: 10, pass: 8, threeStarMs: 50000 },
  { id: 2, code: "PULSE", digits: [2, 1], questions: 10, pass: 8, threeStarMs: 60000 },
  { id: 3, code: "TORQUE", digits: [2, 1], questions: 10, pass: 8, threeStarMs: 70000 },
  { id: 4, code: "GRID", digits: [3, 1], questions: 10, pass: 8, threeStarMs: 80000 },
  { id: 5, code: "VECTOR", digits: [3, 2], questions: 10, pass: 8, threeStarMs: 110000 },
  { id: 6, code: "CARBON", digits: [4, 1], questions: 10, pass: 8, threeStarMs: 100000 },
  { id: 7, code: "APEX", digits: [4, 2], questions: 10, pass: 8, threeStarMs: 130000 },
  { id: 8, code: "NITRO", digits: [4, 2], questions: 10, pass: 8, threeStarMs: 140000 },
];

function describe(modeId, digits) {
  const [a, b] = digits;
  const labels = {
    add: `${a}-digit + ${b}-digit`,
    sub: `${a}-digit − ${b}-digit`,
    mul: `${a}-digit × ${b}-digit`,
    div: `${a}-digit ÷ ${b}-digit`,
    mix: `Mixed · up to ${Math.max(a, b)} digits`,
  };
  return labels[modeId];
}

function levelsFor(modeId) {
  const src = modeId === "mul" ? MUL_LEVELS : modeId === "div" ? DIV_LEVELS : LEVEL_BLUEPRINT;
  return src.map((row) => ({
    ...row,
    name: row.code,
    desc: describe(modeId, row.digits),
  }));
}

export function getMathLevels(modeId) {
  return levelsFor(modeId);
}

export function getMathLevel(modeId, levelId) {
  return getMathLevels(modeId).find((l) => l.id === Number(levelId)) || null;
}

function randomOp() {
  return ["add", "sub", "mul", "div"][rand(0, 3)];
}

function buildQuestion(modeId, level) {
  const op = modeId === "mix" ? randomOp() : modeId;
  let [aDigits, bDigits] = level.digits;

  if (modeId === "mix") {
    if (op === "mul") {
      aDigits = Math.min(aDigits, 3);
      bDigits = Math.min(bDigits, level.id >= 7 ? 2 : 1);
    }
    if (op === "div") {
      bDigits = Math.min(bDigits, 2);
    }
  }

  if (op === "mul" && aDigits >= 3 && bDigits >= 3) {
    bDigits = 2;
  }

  return GENERATORS[op](aDigits, bDigits);
}

export function questionKey(q) {
  if (q.op === "+" || q.op === "*") {
    const [low, high] = q.a <= q.b ? [q.a, q.b] : [q.b, q.a];
    return `${q.op}:${low}:${high}`;
  }
  return `${q.op}:${q.a}:${q.b}`;
}

export function generateQuestion(modeId, level, used = null) {
  let question = buildQuestion(modeId, level);
  if (!used) return question;

  for (let i = 0; i < 48; i += 1) {
    const key = questionKey(question);
    if (!used.has(key)) {
      used.add(key);
      return question;
    }
    question = buildQuestion(modeId, level);
  }

  used.add(questionKey(question));
  return question;
}

export function starCount({ correct, total, timeMs, pass, threeStarMs }) {
  if (correct < pass) return 0;
  if (correct === total && timeMs <= threeStarMs) return 3;
  if (correct >= total - 1) return 2;
  return 1;
}

export const QUESTIONS_PER_LEVEL = 10;
