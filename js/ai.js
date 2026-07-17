/* Простий евристичний ШІ для гри Ур. Грає за гравця B. */
(function () {
  'use strict';

  const G = window.UrGame;

  // Ймовірність викинути рівно n (4 тетраедри): 0:1/16, 1:4/16, 2:6/16, 3:4/16, 4:1/16
  const P = [1 / 16, 4 / 16, 6 / 16, 4 / 16, 1 / 16];

  // Сумарна ймовірність, що суперник наступним кидком влучить у спільну клітину r,
  // маючи фішки на позиціях oppPositions (маршрутні індекси суперника).
  function threat(r, oppPositions) {
    if (r < 5 || r > 12 || r === 8) return 0;
    let prob = 0;
    const seen = new Set();
    for (const q of oppPositions) {
      if (q <= 0 || q >= r) continue;
      const need = r - q;
      if (need >= 1 && need <= 4 && !seen.has(q)) {
        prob += P[need];
        seen.add(q);
      }
    }
    return Math.min(prob, 1);
  }

  function cloneState(state) {
    return {
      v: state.v,
      mode: state.mode,
      pieces: {
        A: state.pieces.A.slice(),
        B: state.pieces.B.slice(),
      },
      turn: state.turn,
      phase: state.phase,
      dice: state.dice ? { marks: state.dice.marks.slice(), total: state.dice.total } : null,
      winner: state.winner,
    };
  }

  function scoreMove(state, mv) {
    const p = state.turn;
    const o = G.opponent(p);
    const oppPositions = state.pieces[o];
    let s = 0;

    if (mv.to === G.OFF) s += 90;                       // зняти фішку
    if (mv.capture !== null && mv.capture !== undefined) {
      s += 55 + oppPositions[mv.capture];               // збити (цінніші — далі)
    }
    if (mv.to === 8) s += 48;                            // безпечний центр + хід
    else if (mv.to === 14) s += 30;                      // розетка перед виходом
    else if (mv.to === 4) s += 22;                       // стартова розетка

    s -= 34 * threat(mv.to, oppPositions);               // не підставлятись
    s += 26 * threat(mv.from, oppPositions);             // тікати з-під удару
    if (mv.from === G.START) s += 6;                     // вводити нові фішки
    s += mv.to * 1.2;                                    // прогрес
    return s;
  }

  // Очікувана сила відповіді суперника: для кожного кидка 1–4 беремо його
  // найкращу відповідь і зважуємо ймовірністю цього кидка (кидок 2 у 6 разів
  // імовірніший за 4 — інакше ШІ переоцінює малоймовірні загрози).
  function bestReplyPenalty(afterMoveState, player) {
    if (afterMoveState.winner || afterMoveState.turn === player) return 0;
    let expected = 0;
    for (let roll = 1; roll <= 4; roll++) {
      const probe = cloneState(afterMoveState);
      probe.dice = { marks: [1, 1, 1, 1].map((_, i) => (i < roll ? 1 : 0)), total: roll };
      probe.phase = 'move';
      let best = 0;
      for (const reply of G.legalMoves(probe)) {
        const replyScore = scoreMove(probe, reply);
        if (replyScore > best) best = replyScore;
      }
      expected += P[roll] * best;
    }
    return expected * 0.8;
  }

  function pickMove(state, moves) {
    const p = state.turn;
    let best = null;
    let bestScore = -Infinity;

    for (const mv of moves) {
      const probe = cloneState(state);
      const ev = G.applyMove(probe, mv);
      let s = scoreMove(state, mv);

      if (ev.win) s += 10000;
      if (ev.rosette) s += 18;                           // зберегти ініціативу
      s -= bestReplyPenalty(probe, p);                    // shallow lookahead на відповідь
      s += Math.random() * 2;                             // трохи варіативності

      if (s > bestScore) { bestScore = s; best = mv; }
    }
    return best;
  }

  window.UrAI = { pickMove, threat, scoreMove, bestReplyPenalty };
})();

