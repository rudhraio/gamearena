const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const LEVELS = [
  { id: 1, code: "SPARK", size: 5, links: [8, 9], walls: [4, 8], threeStarMs: 45000 },
  { id: 2, code: "PULSE", size: 6, links: [8, 10], walls: [8, 14], threeStarMs: 75000 },
  { id: 3, code: "TORQUE", size: 7, links: [10, 12], walls: [12, 20], threeStarMs: 120000 },
  { id: 4, code: "GRID", size: 8, links: [12, 14], walls: [16, 28], threeStarMs: 180000 },
  { id: 5, code: "VECTOR", size: 9, links: [13, 15], walls: [22, 36], threeStarMs: 240000 },
];

const DIRS = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

function cellKey(r, c) {
  return `${r},${c}`;
}

export function edgeKey(a, b) {
  if (a.r < b.r || (a.r === b.r && a.c <= b.c)) return `${a.r},${a.c}|${b.r},${b.c}`;
  return `${b.r},${b.c}|${a.r},${a.c}`;
}

function neighbors(r, c, n) {
  const out = [];
  for (const [dr, dc] of DIRS) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nc >= 0 && nr < n && nc < n) out.push({ r: nr, c: nc });
  }
  return out;
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function snakePath(n) {
  const path = [];
  for (let r = 0; r < n; r += 1) {
    if (r % 2 === 0) {
      for (let c = 0; c < n; c += 1) path.push({ r, c });
    } else {
      for (let c = n - 1; c >= 0; c -= 1) path.push({ r, c });
    }
  }
  return path;
}

function transformCell(r, c, n, kind) {
  switch (kind) {
    case 1:
      return { r: c, c: n - 1 - r };
    case 2:
      return { r: n - 1 - r, c: n - 1 - c };
    case 3:
      return { r: n - 1 - c, c: r };
    case 4:
      return { r, c: n - 1 - c };
    case 5:
      return { r: n - 1 - r, c };
    case 6:
      return { r: c, c: r };
    case 7:
      return { r: n - 1 - c, c: n - 1 - r };
    default:
      return { r, c };
  }
}

function transformPath(path, n, kind) {
  return path.map((cell) => transformCell(cell.r, cell.c, n, kind));
}

function pathCoversGrid(path, n) {
  if (path.length !== n * n) return false;
  const seen = new Set();
  for (const cell of path) {
    if (cell.r < 0 || cell.c < 0 || cell.r >= n || cell.c >= n) return false;
    const key = cellKey(cell.r, cell.c);
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return seen.size === n * n;
}

function backbite(path, n) {
  const useStart = Math.random() < 0.5;
  const p = useStart ? path.slice().reverse() : path.slice();
  const end = p[p.length - 1];
  const prev = p[p.length - 2];
  const options = [];
  for (const nb of neighbors(end.r, end.c, n)) {
    if (nb.r === prev.r && nb.c === prev.c) continue;
    const k = p.findIndex((cell) => cell.r === nb.r && cell.c === nb.c);
    if (k >= 0 && k < p.length - 2) options.push(k);
  }
  if (!options.length) return path;
  const k = options[rand(0, options.length - 1)];
  return p.slice(0, k + 1).concat(p.slice(k + 1).reverse());
}

function generateHamiltonianPath(n) {
  let path = transformPath(snakePath(n), n, rand(0, 7));
  const twists = n * n * 14;
  for (let i = 0; i < twists; i += 1) path = backbite(path, n);
  if (!pathCoversGrid(path, n)) path = snakePath(n);
  return path;
}

function pickLinkIndices(len, count) {
  const segs = count - 1;
  const picks = [0];
  for (let i = 1; i < count - 1; i += 1) {
    const target = Math.round((i * (len - 1)) / segs);
    const span = Math.max(1, Math.floor((len - 1) / segs / 3));
    picks.push(Math.min(len - 2, Math.max(1, target + rand(-span, span))));
  }
  picks.push(len - 1);

  const unique = [...new Set(picks)].sort((a, b) => a - b);
  for (let i = 1; i < unique.length && unique.length < count; i += 1) {
    if (unique[i] - unique[i - 1] > 1) {
      unique.splice(i, 0, unique[i - 1] + 1);
    }
  }
  for (let i = 1; i < len - 1 && unique.length < count; i += 1) {
    if (!unique.includes(i)) unique.push(i);
  }
  return [...new Set(unique)].sort((a, b) => a - b).slice(0, count);
}

function placeNumbers(path, count) {
  const indices = pickLinkIndices(path.length, count);
  const numbers = {};
  indices.forEach((idx, i) => {
    numbers[cellKey(path[idx].r, path[idx].c)] = i + 1;
  });
  return numbers;
}

function pathEdgeSet(path) {
  const set = new Set();
  for (let i = 1; i < path.length; i += 1) set.add(edgeKey(path[i - 1], path[i]));
  return set;
}

function unusedEdges(n, used) {
  const edges = [];
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (c + 1 < n) {
        const key = edgeKey({ r, c }, { r, c: c + 1 });
        if (!used.has(key)) edges.push(key);
      }
      if (r + 1 < n) {
        const key = edgeKey({ r, c }, { r: r + 1, c });
        if (!used.has(key)) edges.push(key);
      }
    }
  }
  return edges;
}

function placeWalls(path, n, count) {
  const unused = shuffle(unusedEdges(n, pathEdgeSet(path)));
  return unused.slice(0, Math.min(count, unused.length));
}

export function parseEdge(key) {
  const [a, b] = key.split("|");
  const [ar, ac] = a.split(",").map(Number);
  const [br, bc] = b.split(",").map(Number);
  return [
    { r: ar, c: ac },
    { r: br, c: bc },
  ];
}

export function wallBetween(puzzle, a, b) {
  return puzzle.walls.includes(edgeKey(a, b));
}

export function numAt(puzzle, r, c) {
  return puzzle.numbers[cellKey(r, c)] || 0;
}

export function maxVisitedNumber(puzzle, path) {
  let max = 0;
  for (const cell of path) {
    const n = numAt(puzzle, cell.r, cell.c);
    if (n > max) max = n;
  }
  return max;
}

export function verifySolution(puzzle, path) {
  const n = puzzle.size;
  const total = n * n;
  if (!puzzle || !path || path.length !== total) return false;

  const seen = new Set();
  for (let i = 0; i < path.length; i += 1) {
    const cell = path[i];
    if (cell.r < 0 || cell.c < 0 || cell.r >= n || cell.c >= n) return false;
    const key = cellKey(cell.r, cell.c);
    if (seen.has(key)) return false;
    seen.add(key);
    if (i > 0) {
      const prev = path[i - 1];
      if (Math.abs(prev.r - cell.r) + Math.abs(prev.c - cell.c) !== 1) return false;
      if (wallBetween(puzzle, prev, cell)) return false;
    }
  }
  if (seen.size !== total) return false;

  let expect = 1;
  for (const cell of path) {
    const value = numAt(puzzle, cell.r, cell.c);
    if (!value) continue;
    if (value !== expect) return false;
    expect += 1;
  }
  return expect === puzzle.links + 1;
}

export function canEnter(puzzle, path, next) {
  const n = puzzle.size;
  if (next.r < 0 || next.c < 0 || next.r >= n || next.c >= n) return false;
  if (path.some((cell) => cell.r === next.r && cell.c === next.c)) return false;

  if (path.length === 0) return numAt(puzzle, next.r, next.c) === 1;

  const head = path[path.length - 1];
  if (Math.abs(head.r - next.r) + Math.abs(head.c - next.c) !== 1) return false;
  if (wallBetween(puzzle, head, next)) return false;

  const value = numAt(puzzle, next.r, next.c);
  if (value > 0 && value !== maxVisitedNumber(puzzle, path) + 1) return false;
  return true;
}

export function isComplete(puzzle, path) {
  return Boolean(puzzle) && path.length === puzzle.size * puzzle.size && verifySolution(puzzle, path);
}

function fallbackPuzzle(level) {
  const n = level.size;
  const path = snakePath(n);
  const links = level.links[0];
  return {
    puzzle: {
      size: n,
      links,
      numbers: placeNumbers(path, links),
      walls: [],
    },
    solution: path,
  };
}

export function generatePuzzle(level) {
  const n = level.size;
  const links = rand(level.links[0], level.links[1]);
  const wallCount = rand(level.walls[0], level.walls[1]);

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const solution = generateHamiltonianPath(n);
    const puzzle = {
      size: n,
      links,
      numbers: placeNumbers(solution, links),
      walls: placeWalls(solution, n, wallCount),
    };
    if (verifySolution(puzzle, solution)) return { puzzle, solution };
  }

  const fallback = fallbackPuzzle(level);
  if (!verifySolution(fallback.puzzle, fallback.solution)) {
    throw new Error("Zip generator failed to prove a path.");
  }
  return fallback;
}

export function zipStars({ timeMs, hints, threeStarMs }) {
  if (hints === 0 && timeMs <= threeStarMs) return 3;
  if (hints <= 2 && timeMs <= threeStarMs * 1.75) return 2;
  return 1;
}

export function getZipLevels() {
  return LEVELS.map((row) => ({
    ...row,
    name: row.code,
    desc: `${row.size}×${row.size} · ${row.links[0]}–${row.links[1]} links`,
  }));
}

export function getZipLevel(levelId) {
  return getZipLevels().find((level) => level.id === Number(levelId)) || null;
}
