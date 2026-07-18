const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadGame() {
  const gamePath = path.resolve(__dirname, '../js/game.js');
  const code = fs.readFileSync(gamePath, 'utf8');
  const sandbox = { window: {}, Math };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: gamePath });
  return sandbox.window.UrGame;
}

const G = loadGame();
function loadAI(game) {
  const aiPath = path.resolve(__dirname, '../js/ai.js');
  const code = fs.readFileSync(aiPath, 'utf8');
  const sandbox = { window: { UrGame: game }, Math };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: aiPath });
  return sandbox.window.UrAI;
}

const AI = loadAI(G);
const plain = (value) => JSON.parse(JSON.stringify(value));

function stateWith({ turn = 'A', dice = 1, A = [], B = [] } = {}) {
  const s = G.newState('pvp');
  s.turn = turn;
  s.phase = 'move';
  s.dice = { marks: [1, 0, 0, 0], total: dice };
  if (A.length) s.pieces.A = A.slice();
  if (B.length) s.pieces.B = B.slice();
  return s;
}

test('newState creates a valid initial game state', () => {
  const s = G.newState('ai');

  assert.equal(s.v, 1);
  assert.equal(s.mode, 'ai');
  assert.equal(s.turn, 'A');
  assert.equal(s.phase, 'roll');
  assert.equal(s.winner, null);
  assert.deepEqual(plain(s.pieces.A), new Array(G.PIECES).fill(G.START));
  assert.deepEqual(plain(s.pieces.B), new Array(G.PIECES).fill(G.START));
});

test('rollDice uses four binary tetrahedra and moves to move phase', () => {
  const s = G.newState('pvp');
  const rolls = [0.1, 0.9, 0.2, 0.8];
  G.rollDice(s, () => rolls.shift());

  assert.deepEqual(plain(s.dice.marks), [1, 0, 1, 0]);
  assert.equal(s.dice.total, 2);
  assert.equal(s.phase, 'move');
});

test('legalMoves enters the top piece from the start stack', () => {
  const s = stateWith({ dice: 4 });
  const moves = G.legalMoves(s);

  assert.equal(moves.length, 1);
  assert.deepEqual(plain(moves[0]), { idx: 6, from: G.START, to: 4, capture: null });
});

test('legalMoves rejects landing on own piece', () => {
  const s = stateWith({ dice: 2, A: [3, 5, 0, 0, 0, 0, 0] });
  const moves = G.legalMoves(s);

  assert.equal(moves.some((m) => m.from === 3 && m.to === 5), false);
});

test('legalMoves allows capture on shared row', () => {
  const s = stateWith({ dice: 2, A: [4, 0, 0, 0, 0, 0, 0], B: [6, 0, 0, 0, 0, 0, 0] });
  const moves = G.legalMoves(s);

  assert.deepEqual(plain(moves.find((m) => m.from === 4)), { idx: 0, from: 4, to: 6, capture: 0 });
});

test('legalMoves blocks capture on central rosette', () => {
  const s = stateWith({ dice: 4, A: [4, 0, 0, 0, 0, 0, 0], B: [8, 0, 0, 0, 0, 0, 0] });
  const moves = G.legalMoves(s);

  assert.equal(moves.some((m) => m.from === 4 && m.to === 8), false);
});

test('legalMoves requires exact roll to bear off', () => {
  const tooFar = stateWith({ dice: 3, A: [13, 0, 0, 0, 0, 0, 0] });
  assert.equal(G.legalMoves(tooFar).some((m) => m.from === 13), false);

  const exact = stateWith({ dice: 2, A: [13, 0, 0, 0, 0, 0, 0] });
  assert.deepEqual(plain(G.legalMoves(exact).find((m) => m.from === 13)), {
    idx: 0,
    from: 13,
    to: G.OFF,
    capture: null,
  });
});

test('applyMove captures, resets captured piece, and passes turn when not on rosette', () => {
  const s = stateWith({ dice: 2, A: [4, 0, 0, 0, 0, 0, 0], B: [6, 0, 0, 0, 0, 0, 0] });
  const mv = G.legalMoves(s).find((m) => m.from === 4);
  const ev = G.applyMove(s, mv);

  assert.equal(ev.capture, true);
  assert.equal(s.pieces.A[0], 6);
  assert.equal(s.pieces.B[0], G.START);
  assert.equal(s.turn, 'B');
  assert.equal(s.phase, 'roll');
});

test('applyMove grants another roll on rosette', () => {
  const s = stateWith({ dice: 4, A: [0, 0, 0, 0, 0, 0, 0] });
  const mv = G.legalMoves(s)[0];
  const ev = G.applyMove(s, mv);

  assert.equal(ev.rosette, true);
  assert.equal(s.turn, 'A');
  assert.equal(s.phase, 'roll');
});

test('applyMove detects win after the final piece bears off', () => {
  const s = stateWith({ dice: 1, A: [14, 15, 15, 15, 15, 15, 15] });
  const mv = G.legalMoves(s)[0];
  const ev = G.applyMove(s, mv);

  assert.equal(ev.win, true);
  assert.equal(s.winner, 'A');
  assert.equal(s.phase, 'over');
  assert.deepEqual(plain(s.pieces.A), new Array(G.PIECES).fill(G.OFF));
});

test('AI score prefers bearing off over ordinary progress', () => {
  const s = stateWith({ turn: 'B', dice: 1, B: [14, 10, 0, 0, 0, 0, 0] });
  const moves = G.legalMoves(s);
  const off = moves.find((m) => m.to === G.OFF);
  const progress = moves.find((m) => m.from === 10);

  assert.ok(AI.scoreMove(s, off) > AI.scoreMove(s, progress));
});

test('AI bestReplyPenalty weighs replies by roll probability', () => {
  // Після ходу B хід переходить до A. Фішку B на спільному ряду A може збити:
  // з клітини 5 кидком 2 (P=6/16) — B на 7; або кидком 4 (P=1/16) — B на 9.
  const likely = stateWith({ turn: 'A', A: [5, 0, 0, 0, 0, 0, 0], B: [7, 0, 0, 0, 0, 0, 0] });
  const unlikely = stateWith({ turn: 'A', A: [5, 0, 0, 0, 0, 0, 0], B: [9, 0, 0, 0, 0, 0, 0] });
  likely.phase = 'roll';
  likely.dice = null;
  unlikely.phase = 'roll';
  unlikely.dice = null;

  assert.ok(AI.bestReplyPenalty(likely, 'B') > AI.bestReplyPenalty(unlikely, 'B'));
});

test('AI pickMove chooses an immediate winning move at every level', () => {
  for (const level of ['easy', 'medium', 'hard', undefined]) {
    const s = stateWith({ turn: 'B', dice: 1, B: [14, 15, 15, 15, 15, 15, 15] });
    const moves = G.legalMoves(s);
    const picked = AI.pickMove(s, moves, level);

    assert.equal(picked.to, G.OFF, `level=${level}`);
  }
});

test('AI pickMove always returns a legal move at every level', () => {
  for (const level of ['easy', 'medium', 'hard']) {
    const s = stateWith({ turn: 'B', dice: 2, A: [8, 0, 0, 0, 0, 0, 0], B: [5, 3, 0, 0, 0, 0, 0] });
    const moves = G.legalMoves(s);
    const picked = AI.pickMove(s, moves, level);

    assert.ok(moves.includes(picked), `level=${level}`);
  }
});

