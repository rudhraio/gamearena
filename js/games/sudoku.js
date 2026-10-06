const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const ALL = 0x3fe;
const random = (n) => Math.floor(Math.random() * n);

function shuffled(values) {
  const list = [...values];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = random(i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function unitOrder() {
  return shuffled([0, 1, 2]).flatMap((band) => shuffled([0, 1, 2]).map((offset) => band * 3 + offset));
}

export function makeSolution() {
  const rows = unitOrder();
  const cols = unitOrder();
  const digits = shuffled(DIGITS);
  return rows.flatMap((row) => cols.map((col) => digits[(row * 3 + Math.floor(row / 3) + col) % 9]));
}

export function countSolutions(board, limit = 2) {
  const rows = Array(9).fill(0);
  const cols = Array(9).fill(0);
  const boxes = Array(9).fill(0);
  const values = [...board];
  for (let i = 0; i < 81; i += 1) {
    const value = values[i];
    if (!value) continue;
    const row = Math.floor(i / 9);
    const col = i % 9;
    const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    const bit = 1 << value;
    if ((rows[row] | cols[col] | boxes[box]) & bit) return 0;
    rows[row] |= bit; cols[col] |= bit; boxes[box] |= bit;
  }

  let solutions = 0;
  function search() {
    if (solutions >= limit) return;
    let best = -1;
    let mask = 0;
    let fewest = 10;
    for (let i = 0; i < 81; i += 1) {
      if (values[i]) continue;
      const row = Math.floor(i / 9);
      const col = i % 9;
      const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
      const choices = ALL & ~(rows[row] | cols[col] | boxes[box]);
      const count = bitCount(choices);
      if (!count) return;
      if (count < fewest) { best = i; mask = choices; fewest = count; }
    }
    if (best < 0) { solutions += 1; return; }
    const row = Math.floor(best / 9);
    const col = best % 9;
    const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    for (let value = 1; value <= 9; value += 1) {
      const bit = 1 << value;
      if (!(mask & bit)) continue;
      values[best] = value;
      rows[row] |= bit; cols[col] |= bit; boxes[box] |= bit;
      search();
      rows[row] ^= bit; cols[col] ^= bit; boxes[box] ^= bit;
      values[best] = 0;
      if (solutions >= limit) break;
    }
  }
  search();
  return solutions;
}

function bitCount(value) {
  let count = 0;
  while (value) { value &= value - 1; count += 1; }
  return count;
}

export function makePuzzle(difficulty = "easy") {
  const targets = { easy: 40, medium: 32, hard: 27 };
  const target = targets[difficulty] || targets.easy;
  let best = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const solution = makeSolution();
    const puzzle = [...solution];
    let clues = 81;
    for (const index of shuffled(Array.from({ length: 81 }, (_, i) => i))) {
      const saved = puzzle[index];
      puzzle[index] = 0;
      if (countSolutions(puzzle) !== 1) puzzle[index] = saved;
      else clues -= 1;
      if (clues <= target) break;
    }
    if (!best || clues < best.clues) best = { puzzle, solution, clues };
    if (clues <= target) break;
  }
  return best;
}

export function hasConflict(board, index) {
  const value = board[index];
  if (!value) return false;
  const row = Math.floor(index / 9);
  const col = index % 9;
  for (let i = 0; i < 81; i += 1) {
    if (i === index || board[i] !== value) continue;
    const otherRow = Math.floor(i / 9);
    const otherCol = i % 9;
    if (row === otherRow || col === otherCol || (Math.floor(row / 3) === Math.floor(otherRow / 3) && Math.floor(col / 3) === Math.floor(otherCol / 3))) return true;
  }
  return false;
}

export function isSolved(board, solution) {
  return board.length === 81 && board.every((value, index) => value === solution[index]);
}
