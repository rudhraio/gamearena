import test from "node:test";
import assert from "node:assert/strict";
import { getMathLevel, generateQuestion } from "../js/games/math.js";
import { canEnter, generatePuzzle, getZipLevels, numAt, verifySolution } from "../js/games/zip.js";
import { countSolutions, hasConflict, isSolved, makePuzzle } from "../js/games/sudoku.js";

test("math questions keep the four operations valid", () => {
  for (const mode of ["add", "sub", "mul", "div", "mix"]) {
    for (let levelId = 1; levelId <= 8; levelId += 1) {
      for (let run = 0; run < 20; run += 1) {
        const question = generateQuestion(mode, getMathLevel(mode, levelId));
        const computed = {
          "+": question.a + question.b,
          "-": question.a - question.b,
          "*": question.a * question.b,
          "/": question.a / question.b,
        }[question.op];
        assert.equal(question.answer, computed);
        assert.ok(Number.isInteger(question.answer) && question.answer >= 0);
      }
    }
  }
});

test("Zip levels remain solvable and difficulty changes guidance", () => {
  for (const level of getZipLevels()) {
    for (const difficulty of ["low", "medium", "high"]) {
      for (let run = 0; run < 8; run += 1) {
        const { puzzle, solution } = generatePuzzle(level, difficulty);
        assert.equal(verifySolution(puzzle, solution), true);
        if (difficulty === "high") assert.equal(puzzle.walls.length, 0);
        let path = [];
        for (const cell of solution) {
          assert.equal(canEnter(puzzle, path, cell), true);
          path = [...path, cell];
        }
        assert.equal(numAt(puzzle, solution[0].r, solution[0].c), 1);
        assert.equal(verifySolution(puzzle, path), true);
      }
    }
  }
});

test("Sudoku puzzles are valid, unique, and detect conflicts", () => {
  for (const difficulty of ["easy", "medium", "hard"]) {
    for (let run = 0; run < 8; run += 1) {
      const { puzzle, solution, clues } = makePuzzle(difficulty);
      assert.equal(puzzle.filter(Boolean).length, clues);
      assert.equal(countSolutions(puzzle), 1);
      assert.equal(isSolved(solution, solution), true);
      assert.equal(solution.every((value, index) => puzzle[index] === 0 || puzzle[index] === value), true);
      const wrong = [...solution];
      wrong[0] = wrong[1];
      assert.equal(hasConflict(wrong, 0), true);
      assert.equal(isSolved(wrong, solution), false);
    }
  }
});
