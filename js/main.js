/* Королівська гра Ур — UI, взаємодія, збереження стану. */
(function () {
  'use strict';

  const G = window.UrGame;
  const B = window.UrBoard;
  const SAVE_KEY = 'gameur-save-v1';

  // --- DOM ---
  const svg = document.getElementById('board');
  const rollBtn = document.getElementById('roll-btn');
  const diceBox = document.getElementById('dice');
  const statusBox = document.getElementById('status');
  const toastBox = document.getElementById('toast');
  const dlgNew = document.getElementById('dlg-new');
  const dlgRules = document.getElementById('dlg-rules');
  const overlay = document.getElementById('overlay');

  let S = null;              // стан гри
  let layers = null;         // шари SVG
  let pieceEls = {};         // 'A0'.. -> <g>
  let curMoves = [];         // легальні ходи поточної фази
  let timer = null;          // відкладені дії (ШІ, пас)

  const later = (fn, ms) => { clearTimeout(timer); timer = setTimeout(fn, ms); };

  // --- Збереження ---
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* приватний режим */ }
  }
  function isPieceList(value) {
    return Array.isArray(value) && value.length === G.PIECES &&
      value.every((pos) => Number.isInteger(pos) && pos >= G.START && pos <= G.OFF);
  }

  function validateState(s) {
    if (!s || s.v !== 1) return false;
    if (s.mode !== 'ai' && s.mode !== 'pvp') return false;
    if (s.turn !== 'A' && s.turn !== 'B') return false;
    if (!['roll', 'move', 'over'].includes(s.phase)) return false;
    if (!s.pieces || !isPieceList(s.pieces.A) || !isPieceList(s.pieces.B)) return false;
    if (s.winner !== null && s.winner !== 'A' && s.winner !== 'B') return false;
    if (s.phase === 'over') return false; // завершені партії не відновлюємо
    if (s.winner) return false;
    if (s.phase === 'roll') return s.dice === null;
    if (s.phase !== 'move') return false;
    if (!s.dice || !Array.isArray(s.dice.marks) || s.dice.marks.length !== 4) return false;
    if (!s.dice.marks.every((m) => m === 0 || m === 1)) return false;
    return s.dice.total === s.dice.marks.reduce((a, b) => a + b, 0);
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (validateState(s)) return s;
      localStorage.removeItem(SAVE_KEY);
    } catch (e) { /* ігноруємо биті дані */ }
    return null;
  }

  // --- Допоміжне ---
  const isAITurn = () => S.mode === 'ai' && S.turn === 'B';
  const nameOf = (p) => (p === 'A' ? 'Білі' : (S.mode === 'ai' ? 'Компʼютер' : 'Чорні'));

  function toast(msg, ms) {
    toastBox.textContent = msg;
    toastBox.classList.add('show');
    clearTimeout(toastBox._t);
    toastBox._t = setTimeout(() => toastBox.classList.remove('show'), ms || 1700);
  }

  // --- Фішки ---
  function makePieces() {
    layers.pieceLayer.innerHTML = '';
    pieceEls = {};
    for (const p of ['A', 'B']) {
      for (let i = 0; i < G.PIECES; i++) {
        const g = B.el('g', { class: 'piece p' + p, 'data-player': p, 'data-idx': i }, layers.pieceLayer);
        B.el('circle', { r: 23, class: 'ring' }, g);
        B.el('circle', { r: 20, class: 'disc' }, g);
        const dotFill = p === 'A' ? B.colors.lapis : '#efe4c9';
        for (const [dx, dy] of [[0, 0], [-8, -8], [8, -8], [-8, 8], [8, 8]]) {
          B.el('circle', { cx: dx, cy: dy, r: 3, fill: dotFill, class: 'pip' }, g);
        }
        g.addEventListener('click', onPieceClick);
        pieceEls[p + i] = g;
      }
    }
  }

  function piecePos(p, idx) {
    const pos = S.pieces[p][idx];
    if (pos === G.START) {
      const order = S.pieces[p].map((v, i) => [v, i]).filter((x) => x[0] === G.START).map((x) => x[1]);
      return B.poolSlot(p, 'start', order.indexOf(idx));
    }
    if (pos === G.OFF) {
      const order = S.pieces[p].map((v, i) => [v, i]).filter((x) => x[0] === G.OFF).map((x) => x[1]);
      return B.poolSlot(p, 'off', order.indexOf(idx));
    }
    return B.center(p, pos);
  }

  function renderPieces() {
    for (const p of ['A', 'B']) {
      for (let i = 0; i < G.PIECES; i++) {
        const { x, y } = piecePos(p, i);
        pieceEls[p + i].style.transform = `translate(${x}px, ${y}px)`;
      }
    }
  }

  // --- Підсвітки ---
  function renderHighlights() {
    layers.hlLayer.innerHTML = '';
    for (const el of Object.values(pieceEls)) el.classList.remove('movable');
    if (S.phase !== 'move' || isAITurn() || !curMoves.length) return;

    for (let mi = 0; mi < curMoves.length; mi++) {
      const mv = curMoves[mi];
      // підсвітити фішку-джерело (для старту — верхню в стосі)
      if (mv.from === G.START) {
        const startIdxs = S.pieces[S.turn]
          .map((v, i) => [v, i]).filter((x) => x[0] === G.START).map((x) => x[1]);
        const top = startIdxs[startIdxs.length - 1];
        pieceEls[S.turn + top].classList.add('movable');
      } else {
        pieceEls[S.turn + mv.idx].classList.add('movable');
      }
      // маркер цілі
      const c = mv.to === G.OFF
        ? B.poolSlot(S.turn, 'off', S.pieces[S.turn].filter((v) => v === G.OFF).length)
        : B.center(S.turn, mv.to);
      const m = B.el('circle', {
        cx: c.x, cy: c.y, r: 26, class: 'dest' + (mv.capture !== null && mv.capture !== undefined ? ' cap' : ''),
        'data-mi': mi,
      }, layers.hlLayer);
      m.addEventListener('click', () => execMove(curMoves[+m.getAttribute('data-mi')]));
    }
  }

  // --- Кубики / статус ---
  function renderDice() {
    if (!S.dice) {
      diceBox.innerHTML = '<span class="dice-hint">' +
        (S.phase === 'roll' && !S.winner ? 'кидайте кубики' : '') + '</span>';
      return;
    }
    let html = '<span class="tetra-row">';
    for (const m of S.dice.marks) {
      html += `<svg viewBox="0 0 30 28" class="tetra"><path d="M15 2 L28 26 L2 26 Z"/>` +
        (m ? '<circle cx="15" cy="9" r="4.2" class="mark"/>' : '') + '</svg>';
    }
    html += `</span><span class="dice-total">${S.dice.total}</span>`;
    diceBox.innerHTML = html;
  }

  function renderStatus() {
    const offA = S.pieces.A.filter((v) => v === G.OFF).length;
    const offB = S.pieces.B.filter((v) => v === G.OFF).length;
    statusBox.innerHTML =
      chip('A', offA, S.turn === 'A' && !S.winner) +
      '<span class="vs">·</span>' +
      chip('B', offB, S.turn === 'B' && !S.winner);
    rollBtn.disabled = !(S.phase === 'roll' && !S.winner && !isAITurn());
  }
  function chip(p, off, active) {
    return `<span class="chip ${active ? 'active' : ''}"><span class="mini m${p}"></span>` +
      `${nameOf(p)} <b>${off}/7</b></span>`;
  }

  function render() {
    renderPieces();
    renderDice();
    renderStatus();
    renderHighlights();
  }

  // --- Логіка ходу ---
  function doRoll() {
    if (S.phase !== 'roll' || S.winner) return;
    G.rollDice(S);
    save();
    render();
    afterRoll();
  }

  function afterRoll() {
    curMoves = G.legalMoves(S);
    if (S.dice.total === 0) {
      toast(`${nameOf(S.turn)}: випало 0 — хід переходить`);
      later(passTurn, 1300);
      return;
    }
    if (!curMoves.length) {
      toast(`${nameOf(S.turn)}: немає можливих ходів`);
      later(passTurn, 1300);
      return;
    }
    if (isAITurn()) {
      later(() => execMove(window.UrAI.pickMove(S, curMoves)), 850);
    } else {
      renderHighlights();
    }
  }

  function passTurn() {
    G.endTurn(S);
    curMoves = [];
    save();
    render();
    maybeContinue();
  }

  function execMove(mv) {
    if (!mv || S.phase !== 'move') return;
    const mover = S.turn;
    const ev = G.applyMove(S, mv);
    curMoves = [];
    save();
    render();
    if (ev.win) { showWinner(mover); return; }
    if (ev.capture) toast(`${nameOf(mover)}: фішку суперника збито!`);
    else if (ev.bearOff) toast(`${nameOf(mover)}: фішка вийшла (${S.pieces[mover].filter((v) => v === G.OFF).length}/7)`);
    if (ev.rosette) toast(`${nameOf(mover)}: розетка ✿ — додатковий хід`);
    maybeContinue();
  }

  function maybeContinue() {
    if (S.winner) return;
    if (S.phase === 'roll' && isAITurn()) later(doRoll, 900);
  }

  // --- Кліки ---
  function onPieceClick(e) {
    if (S.phase !== 'move' || isAITurn() || S.winner) return;
    const g = e.currentTarget;
    const p = g.getAttribute('data-player');
    const idx = +g.getAttribute('data-idx');
    const pos = S.pieces[p][idx];
    if (p === S.turn) {
      // пошук за позицією, не за idx: хід зі старту створюється для першої фішки
      // стосу, а клік влучає у верхню (з іншим idx)
      const mv = curMoves.find((m) => m.from === pos);
      if (mv) execMove(mv);
    } else {
      // клік по фішці суперника = хід-збивання на її клітину
      const cell = G.cellId(p, pos);
      const mv = curMoves.find((m) => m.to < G.OFF && G.cellId(S.turn, m.to) === cell);
      if (mv) execMove(mv);
    }
  }

  function onCellClick(e) {
    if (S.phase !== 'move' || isAITurn() || S.winner) return;
    const cell = e.target.getAttribute('data-cell');
    if (!cell) return;
    const mv = curMoves.find((m) => m.to < G.OFF && G.cellId(S.turn, m.to) === cell);
    if (mv) execMove(mv);
  }

  // --- Перемога / нова гра ---
  function showWinner(p) {
    overlay.querySelector('.win-text').textContent = `${nameOf(p)} — перемога!`;
    overlay.classList.add('show');
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
  }

  function newGame(mode) {
    clearTimeout(timer);
    overlay.classList.remove('show');
    S = G.newState(mode);
    curMoves = [];
    makePieces();
    save();
    render();
    toast('Нова гра. Починають білі.');
  }

  // --- Ініціалізація ---
  function init() {
    layers = B.build(svg);
    layers.hitLayer.addEventListener('click', onCellClick);

    rollBtn.addEventListener('click', doRoll);
    document.getElementById('new-btn').addEventListener('click', () => dlgNew.showModal());
    document.getElementById('rules-btn').addEventListener('click', () => dlgRules.showModal());
    document.getElementById('win-new-btn').addEventListener('click', () => {
      overlay.classList.remove('show');
      dlgNew.showModal();
    });
    dlgNew.querySelectorAll('[data-mode]').forEach((b) =>
      b.addEventListener('click', () => { dlgNew.close(); newGame(b.getAttribute('data-mode')); }));
    dlgNew.querySelector('.dlg-close').addEventListener('click', () => dlgNew.close());
    dlgRules.querySelector('.dlg-close').addEventListener('click', () => dlgRules.close());

    const saved = loadSave();
    if (saved) {
      S = saved;
      makePieces();
      render();
      toast('Гру відновлено');
      if (S.phase === 'move') { curMoves = G.legalMoves(S); afterRoll(); }
      else maybeContinue();
    } else {
      S = G.newState('ai'); // тло за діалогом
      makePieces();
      render();
      dlgNew.showModal();
    }
  }

  init();
})();

