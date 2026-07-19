/* Королівська гра Ур — рушій правил (реконструкція Фінкеля).
 * Маршрут фішки: 0 = старт (поза дошкою), 1..14 = клітини, 15 = знята з дошки.
 * Клітини 5..12 — спільний центральний ряд, решта — приватні.
 * Розетки: 4, 8, 14 (+додатковий хід, захист; 8 — блокує суперника).
 */
(function () {
  'use strict';

  const START = 0;
  const OFF = 15;
  const ROSETTES = new Set([4, 8, 14]);
  const PIECES = 7;

  function newState(mode) {
    return {
      v: 1,
      mode, // 'pvp' | 'ai'
      pieces: {
        A: new Array(PIECES).fill(START),
        B: new Array(PIECES).fill(START),
      },
      turn: 'A',
      phase: 'roll', // 'roll' | 'move' | 'over'
      dice: null,    // { marks: [0|1,0|1,0|1,0|1], total: 0..4 }
      winner: null,
    };
  }

  function opponent(p) { return p === 'A' ? 'B' : 'A'; }

  // Фізична клітина: спільні мають один id для обох гравців.
  function cellId(player, r) {
    return (r >= 5 && r <= 12) ? 'M' + r : player + r;
  }

  // Карта зайнятості: cellId -> { player, idx }
  function occupancy(state) {
    const map = {};
    for (const p of ['A', 'B']) {
      state.pieces[p].forEach((pos, idx) => {
        if (pos > START && pos < OFF) map[cellId(p, pos)] = { player: p, idx };
      });
    }
    return map;
  }

  function hasValidOccupancy(state) {
    if (!state || !state.pieces || !Array.isArray(state.pieces.A) || !Array.isArray(state.pieces.B)) return false;
    const seen = new Set();
    for (const p of ['A', 'B']) {
      for (const pos of state.pieces[p]) {
        if (pos <= START || pos >= OFF) continue;
        const cell = cellId(p, pos);
        if (seen.has(cell)) return false;
        seen.add(cell);
      }
    }
    return true;
  }

  function rollDice(state, rng) {
    rng = rng || Math.random;
    const marks = [0, 0, 0, 0].map(() => (rng() < 0.5 ? 1 : 0));
    state.dice = { marks, total: marks.reduce((a, b) => a + b, 0) };
    state.phase = 'move';
  }

  // Список легальних ходів для гравця state.turn при кинутих кубиках.
  function legalMoves(state) {
    if (!state.dice || !state.dice.total) return [];
    const p = state.turn;
    const n = state.dice.total;
    const occ = occupancy(state);
    const moves = [];
    const seenOrigins = new Set();
    const topStartIdx = state.pieces[p].lastIndexOf(START);

    state.pieces[p].forEach((pos, idx) => {
      if (pos === OFF) return;
      if (pos === START && idx !== topStartIdx) return; // зі стартового стосу рухається верхня фішка
      if (seenOrigins.has(pos)) return; // дублікати позицій на полі ігноруємо захисно
      seenOrigins.add(pos);

      const dest = pos + n;
      if (dest > OFF) return; // зняття лише точним кидком

      if (dest === OFF) {
        moves.push({ idx, from: pos, to: dest, capture: null });
        return;
      }
      const c = occ[cellId(p, dest)];
      if (c) {
        if (c.player === p) return;          // своя фішка
        if (dest === 8) return;              // центральна розетка — блок
        moves.push({ idx, from: pos, to: dest, capture: c.idx });
      } else {
        moves.push({ idx, from: pos, to: dest, capture: null });
      }
    });
    return moves;
  }

  // Застосувати хід. Повертає події для UI.
  function applyMove(state, mv) {
    const p = state.turn;
    const o = opponent(p);
    const events = { capture: false, rosette: false, bearOff: false, win: false };

    state.pieces[p][mv.idx] = mv.to;
    if (mv.capture !== null && mv.capture !== undefined) {
      state.pieces[o][mv.capture] = START;
      events.capture = true;
    }
    if (mv.to === OFF) events.bearOff = true;

    state.dice = null;
    if (state.pieces[p].every((x) => x === OFF)) {
      state.winner = p;
      state.phase = 'over';
      events.win = true;
    } else if (mv.to < OFF && ROSETTES.has(mv.to)) {
      state.phase = 'roll'; // додатковий хід
      events.rosette = true;
    } else {
      state.turn = o;
      state.phase = 'roll';
    }
    return events;
  }

  function endTurn(state) {
    state.turn = opponent(state.turn);
    state.phase = 'roll';
    state.dice = null;
  }

  window.UrGame = {
    START, OFF, ROSETTES, PIECES,
    newState, opponent, cellId, occupancy, hasValidOccupancy,
    rollDice, legalMoves, applyMove, endTurn,
  };
})();

