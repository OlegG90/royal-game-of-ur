/* Королівська гра Ур — UI (екрани меню/гра), взаємодія, збереження стану. */
(function () {
  'use strict';

  const ROBOT_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2.5v3" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="2.6" r="1.5" fill="#fff"/><rect x="5" y="7.5" width="14" height="11" rx="3.2" fill="#fff"/><circle cx="9.4" cy="13" r="1.9" fill="#20160c"/><circle cx="14.6" cy="13" r="1.9" fill="#20160c"/></svg>';
  const PERSON_SVG = '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6" fill="#c9b389"/><path d="M5 19c0-3.6 3.1-6 7-6s7 2.4 7 6" fill="#c9b389"/></svg>';

  const G = window.UrGame;
  const B = window.UrBoard;
  const T = window.UrI18n.t;
  // Локальний fallback: у проді CI підставляє сюди тег STABLE_TAG (див. pages.yml),
  // тож справжня версія має єдине джерело — тег деплою.
  const STABLE_VERSION = 'dev';
  const SAVE_KEY = 'gameur-save-v1';
  const CFG_KEY = 'gameur-cfg-v1';

  // --- DOM ---
  const $ = (id) => document.getElementById(id);
  const screenMenu = $('screen-menu');
  const screenGame = $('screen-game');
  const svg = $('board');
  const rollBtn = $('roll-btn');
  const statusBox = $('status');
  const toastBox = $('toast');
  const overlay = $('overlay');
  const dlgRules = $('dlg-rules');
  const diceCard = $('dice-card');
  const diceTris = [...$('dice-tris').children];
  const diceResult = $('dice-result');
  const diceTotalEl = $('dice-total');
  const aiOpts = $('ai-opts');
  const continueBtn = $('continue-btn');

  let S = null;               // стан гри
  let layers = null;          // шари SVG
  let pieceEls = {};          // 'A0'.. -> <g>
  let curMoves = [];          // легальні ходи поточної фази
  let timer = null;           // відкладені дії (ШІ, пас)
  let animIv = null;          // інтервал анімації кубиків
  let rolling = false;        // триває анімація кидка
  let cfg = { mode: 'ai', level: 'medium', side: 'A' }; // налаштування меню

  const later = (fn, ms) => { clearTimeout(timer); timer = setTimeout(fn, ms); };
  const stopTimers = () => {
    clearTimeout(timer);
    clearInterval(animIv);
    rolling = false;
    diceCard.classList.remove('ur-rolling');
  };

  // --- Налаштування (меню) ---
  function loadCfg() {
    try {
      const c = JSON.parse(localStorage.getItem(CFG_KEY) || 'null');
      if (c) {
        if (c.mode === 'ai' || c.mode === 'pvp') cfg.mode = c.mode;
        if (['easy', 'medium', 'hard'].includes(c.level)) cfg.level = c.level;
        if (c.side === 'A' || c.side === 'B') cfg.side = c.side;
      } else {
        const l = localStorage.getItem('gameur-level'); // legacy
        if (['easy', 'medium', 'hard'].includes(l)) cfg.level = l;
      }
    } catch (e) { /* ignore */ }
  }
  function saveCfg() {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) { /* ignore */ }
  }

  // --- Збереження партії ---
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* приватний режим */ }
  }
  function isPieceList(value) {
    return Array.isArray(value) && value.length === G.PIECES &&
      value.every((pos) => Number.isInteger(pos) && pos >= G.START && pos <= G.OFF);
  }
  function versionLabel() {
    const path = window.location.pathname.split('/').filter(Boolean);
    if (path.includes('latest')) return 'latest';
    return STABLE_VERSION === 'dev' ? 'dev' : 'v' + STABLE_VERSION;
  }
  function validateState(s) {
    if (!s || s.v !== 1) return false;
    if (s.mode !== 'ai' && s.mode !== 'pvp') return false;
    if (s.turn !== 'A' && s.turn !== 'B') return false;
    if (!['roll', 'move', 'over'].includes(s.phase)) return false;
    if (!s.pieces || !isPieceList(s.pieces.A) || !isPieceList(s.pieces.B)) return false;
    if (!G.hasValidOccupancy(s)) return false;
    if (s.winner !== null && s.winner !== 'A' && s.winner !== 'B') return false;
    if (s.mode === 'ai' && s.aiSide !== undefined && s.aiSide !== 'A' && s.aiSide !== 'B') return false;
    if (s.mode === 'ai' && s.aiLevel !== undefined && !['easy', 'medium', 'hard'].includes(s.aiLevel)) return false;
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
      if (validateState(s)) {
        if (s.mode === 'ai' && s.aiSide === undefined) s.aiSide = 'B';
        if (s.mode === 'ai' && s.aiLevel === undefined) s.aiLevel = cfg.level;
        return s;
      }
      localStorage.removeItem(SAVE_KEY);
    } catch (e) { /* ігноруємо биті дані */ }
    return null;
  }

  // --- Допоміжне ---
  const aiSide = () => (S.aiSide === 'A' ? 'A' : 'B');
  const isAITurn = () => S.mode === 'ai' && S.turn === aiSide();
  const nameOf = (p) => (S.mode === 'ai' && p === aiSide()
    ? T('computer')
    : (p === 'A' ? T('white') : T('black')));
  const levelKey = (l) => ({ easy: 'levelEasy', medium: 'levelMedium', hard: 'levelHard' }[l] || 'levelHard');

  function toast(msg, ms) {
    toastBox.textContent = msg;
    toastBox.classList.add('show');
    clearTimeout(toastBox._t);
    toastBox._t = setTimeout(() => toastBox.classList.remove('show'), ms || 1900);
  }

  // --- Екрани ---
  function showScreen(name) {
    screenMenu.hidden = name !== 'menu';
    screenGame.hidden = name !== 'game';
    if (name === 'menu') renderMenu();
  }

  function renderMenu() {
    document.querySelectorAll('#screen-menu [data-mode]').forEach((c) =>
      c.classList.toggle('sel', c.getAttribute('data-mode') === cfg.mode));
    aiOpts.style.display = cfg.mode === 'ai' ? '' : 'none';
    document.querySelectorAll('#level-seg [data-level]').forEach((b) =>
      b.classList.toggle('active', b.getAttribute('data-level') === cfg.level));
    document.querySelectorAll('#screen-menu [data-side]').forEach((c) =>
      c.classList.toggle('sel', c.getAttribute('data-side') === cfg.side));
    const mb = $('menu-cpu-badge');
    if (mb) mb.className = 'role-badge cpu lvl-' + cfg.level;
    continueBtn.hidden = !(S && !S.winner);
  }

  // --- Фішки ---
  function makePieces() {
    layers.pieceLayer.innerHTML = '';
    pieceEls = {};
    for (const p of ['A', 'B']) {
      for (let i = 0; i < G.PIECES; i++) {
        const g = B.el('g', { class: 'piece p' + p, 'data-player': p, 'data-idx': i }, layers.pieceLayer);
        B.el('circle', { r: 29, class: 'ring' }, g);
        B.el('circle', { r: 26, class: 'disc' }, g);
        const dotFill = p === 'A' ? '#a63b2a' : '#c9b389';
        for (const [dx, dy] of [[0, 0], [-9, -9], [9, -9], [-9, 9], [9, 9]]) {
          B.el('circle', { cx: dx, cy: dy, r: 3.2, fill: dotFill, class: 'pip' }, g);
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
      return { slot: B.poolSlot(p, 'start', order.indexOf(idx)), small: true };
    }
    if (pos === G.OFF) {
      const order = S.pieces[p].map((v, i) => [v, i]).filter((x) => x[0] === G.OFF).map((x) => x[1]);
      return { slot: B.poolSlot(p, 'off', order.indexOf(idx)), small: true };
    }
    return { slot: B.center(p, pos), small: false };
  }

  function renderPieces() {
    for (const p of ['A', 'B']) {
      for (let i = 0; i < G.PIECES; i++) {
        const { slot, small } = piecePos(p, i);
        pieceEls[p + i].style.transform =
          `translate(${slot.x}px, ${slot.y}px) scale(${small ? 0.42 : 1})`;
      }
    }
  }

  // --- Підсвітки ---
  function renderHighlights() {
    layers.hlLayer.innerHTML = '';
    for (const el of Object.values(pieceEls)) el.classList.remove('movable');
    if (S.phase !== 'move' || isAITurn() || rolling || !curMoves.length) return;

    for (const mv of curMoves) {
      pieceEls[S.turn + mv.idx].classList.add('movable');
      if (mv.to === G.OFF) continue; // зняття — кліком по фішці
      const c = B.center(S.turn, mv.to);
      const cap = mv.capture !== null && mv.capture !== undefined;
      const r = B.el('rect', {
        x: c.x - B.CELL / 2, y: c.y - B.CELL / 2, width: B.CELL, height: B.CELL, rx: 6,
        class: 'dest' + (cap ? ' cap' : ''),
      }, layers.hlLayer);
      B.el('circle', { cx: c.x, cy: c.y, r: 9, class: 'dest-dot' + (cap ? ' cap' : '') }, layers.hlLayer);
      r.addEventListener('click', () => execMove(mv));
    }
  }

  // --- Кубики ---
  function setTris(marks) {
    diceTris.forEach((el, i) => el.classList.toggle('mark', !!(marks && marks[i])));
  }
  function renderDice() {
    if (S.dice) {
      setTris(S.dice.marks);
      diceTotalEl.textContent = S.dice.total;
      diceResult.hidden = false;
    } else {
      setTris(null);
      diceResult.hidden = true;
    }
  }
  function animateRoll(done) {
    rolling = true;
    diceCard.classList.add('ur-rolling');
    diceResult.hidden = true;
    renderStatus();
    renderCards();
    let n = 0;
    clearInterval(animIv);
    animIv = setInterval(() => {
      setTris([0, 0, 0, 0].map(() => (Math.random() < 0.5 ? 1 : 0)));
      if (++n > 7) {
        clearInterval(animIv);
        diceCard.classList.remove('ur-rolling');
        rolling = false;
        done();
      }
    }, 70);
  }

  // --- Статус і картки гравців ---
  function statusText() {
    if (!S) return '';
    if (S.winner) return winnerText();
    if (rolling) return T('stRolling');
    if (isAITurn()) return T('stAI');
    if (S.mode === 'pvp') {
      const name = T(S.turn === 'A' ? 'whiteGen' : 'blackGen');
      return T(S.phase === 'roll' ? 'stPvpRoll' : 'stPvpPick', { name });
    }
    return T(S.phase === 'roll' ? 'stYourRoll' : 'stPick');
  }
  function renderStatus() { statusBox.textContent = statusText(); }

  function renderCards() {
    for (const p of ['A', 'B']) {
      const isCpu = S.mode === 'ai' && p === aiSide();
      // Іконка-бейдж ролі: людина (нейтральний) / робот у квадраті з кольором складності.
      const icon = $('icon-' + p);
      if (icon) {
        icon.innerHTML = isCpu
          ? '<span class="role-badge cpu lvl-' + S.aiLevel + '">' + ROBOT_SVG + '</span>'
          : '<span class="role-badge human">' + PERSON_SVG + '</span>';
      }
      const fullName = S.mode === 'pvp'
        ? T(p === 'A' ? 'white' : 'black')
        : (isCpu ? T(p === 'A' ? 'cpuWhite' : 'cpuBlack') : T(p === 'A' ? 'youWhite' : 'youBlack'));
      // Складність тепер кодується кольором бейджа — текст прибрано (не перетинається).
      $('card-' + p).title = isCpu
        ? fullName + ' · ' + T('diffSub', { level: T(levelKey(S.aiLevel)).toLowerCase() })
        : fullName;
      const sub = $('sub-' + p);
      if (sub) sub.textContent = '';
      $('off-' + p).textContent = S.pieces[p].filter((v) => v === G.OFF).length;
      $('card-' + p).classList.toggle('active', S.turn === p && !S.winner);
    }
    const canRoll = S.phase === 'roll' && !S.winner && !isAITurn() && !rolling;
    rollBtn.disabled = !canRoll;
    rollBtn.classList.toggle('ur-roll', canRoll);
  }

  function renderAll() {
    renderPieces();
    renderDice();
    renderStatus();
    renderCards();
    renderHighlights();
  }

  // --- Логіка ходу ---
  function rollFlow() {
    animateRoll(() => {
      G.rollDice(S);
      save();
      renderAll();
      afterRoll();
    });
  }

  function doRollHuman() {
    if (!S || S.phase !== 'roll' || S.winner || rolling || isAITurn()) return;
    rollFlow();
  }

  function afterRoll() {
    curMoves = G.legalMoves(S);
    if (S.dice.total === 0) {
      toast(T('toastZero', { name: nameOf(S.turn) }));
      later(passTurn, 1250);
      return;
    }
    if (!curMoves.length) {
      toast(T('toastNoMoves', { name: nameOf(S.turn) }));
      later(passTurn, 1250);
      return;
    }
    if (isAITurn()) {
      later(() => execMove(window.UrAI.pickMove(S, curMoves, S.aiLevel)), 650);
    } else {
      renderHighlights();
    }
  }

  function passTurn() {
    G.endTurn(S);
    curMoves = [];
    save();
    renderAll();
    maybeContinue();
  }

  function execMove(mv) {
    if (!mv || S.phase !== 'move' || rolling) return;
    const mover = S.turn;
    const ev = G.applyMove(S, mv);
    curMoves = [];
    save();
    renderAll();
    if (ev.win) { showWinner(); return; }
    if (ev.capture) toast(T('toastCapture', { name: nameOf(mover) }));
    else if (ev.bearOff) toast(T('toastBearOff', { name: nameOf(mover), n: S.pieces[mover].filter((v) => v === G.OFF).length }));
    if (ev.rosette) toast(T('toastRosette', { name: nameOf(mover) }));
    maybeContinue();
  }

  function maybeContinue() {
    if (!S || S.winner) return;
    if (S.phase === 'roll' && isAITurn()) {
      later(() => { if (isAITurn() && !S.winner) rollFlow(); }, 550);
    }
  }

  function resumeFlow() {
    if (S.phase === 'move') { curMoves = G.legalMoves(S); afterRoll(); }
    else maybeContinue();
  }

  // --- Кліки по дошці ---
  function onPieceClick(e) {
    if (!S || S.phase !== 'move' || isAITurn() || S.winner || rolling) return;
    const g = e.currentTarget;
    const p = g.getAttribute('data-player');
    const idx = +g.getAttribute('data-idx');
    if (p === S.turn) {
      const mv = curMoves.find((m) => m.idx === idx);
      if (mv) execMove(mv);
    } else {
      // клік по фішці суперника = хід-збивання на її клітину
      const cell = G.cellId(p, S.pieces[p][idx]);
      const mv = curMoves.find((m) => m.to < G.OFF && G.cellId(S.turn, m.to) === cell);
      if (mv) execMove(mv);
    }
  }
  function onCellClick(e) {
    if (!S || S.phase !== 'move' || isAITurn() || S.winner || rolling) return;
    const cell = e.target.getAttribute('data-cell');
    if (!cell) return;
    const mv = curMoves.find((m) => m.to < G.OFF && G.cellId(S.turn, m.to) === cell);
    if (mv) execMove(mv);
  }

  // --- Перемога / нова гра ---
  function winnerText() {
    if (!S || !S.winner) return '';
    if (S.mode === 'pvp') return T('winPvp', { name: T(S.winner === 'A' ? 'white' : 'black') });
    return S.winner === aiSide() ? T('cpuWin') : T('youWin');
  }
  function showWinner() {
    const a = S.pieces.A.filter((x) => x === G.OFF).length;
    const b = S.pieces.B.filter((x) => x === G.OFF).length;
    overlay.querySelector('.win-text').textContent = winnerText();
    overlay.querySelector('.win-sub').textContent = T('overSub', { a, b });
    overlay.classList.add('show');
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  }

  function newGame() {
    stopTimers();
    overlay.classList.remove('show');
    S = G.newState(cfg.mode);
    if (cfg.mode === 'ai') {
      S.aiSide = cfg.side === 'A' ? 'B' : 'A'; // ШІ грає протилежною стороною
      S.aiLevel = cfg.level;
    }
    curMoves = [];
    saveCfg();
    makePieces();
    save();
    showScreen('game');
    renderAll();
    maybeContinue(); // якщо компʼютер грає білими — він ходить першим
  }

  function toMenu() {
    stopTimers();
    overlay.classList.remove('show');
    showScreen('menu');
  }

  // --- Ініціалізація ---
  function init() {
    loadCfg();
    document.querySelectorAll('.app-version').forEach((el) => { el.textContent = versionLabel(); });
    layers = B.build(svg);
    layers.hitLayer.addEventListener('click', onCellClick);

    // меню
    document.querySelectorAll('#screen-menu [data-mode]').forEach((c) =>
      c.addEventListener('click', () => { cfg.mode = c.getAttribute('data-mode'); saveCfg(); renderMenu(); }));
    document.querySelectorAll('#level-seg [data-level]').forEach((b) =>
      b.addEventListener('click', () => { cfg.level = b.getAttribute('data-level'); saveCfg(); renderMenu(); }));
    document.querySelectorAll('#screen-menu [data-side]').forEach((c) =>
      c.addEventListener('click', () => { cfg.side = c.getAttribute('data-side'); saveCfg(); renderMenu(); }));
    $('start-btn').addEventListener('click', newGame);
    continueBtn.addEventListener('click', () => { showScreen('game'); renderAll(); resumeFlow(); });
    document.querySelectorAll('.rules-open').forEach((b) =>
      b.addEventListener('click', () => dlgRules.showModal()));
    document.querySelectorAll('.intro-open').forEach((b) =>
      b.addEventListener('click', () => $('dlg-intro').showModal()));
    document.querySelectorAll('dialog .dlg-close').forEach((b) =>
      b.addEventListener('click', () => b.closest('dialog').close()));

    // гра
    rollBtn.addEventListener('click', doRollHuman);
    $('menu-btn').addEventListener('click', toMenu);
    $('rematch-btn').addEventListener('click', newGame);
    $('overlay-menu-btn').addEventListener('click', toMenu);

    // мова: перерендер динамічних текстів
    window.addEventListener('gameur:lang', () => {
      if (S) { renderStatus(); renderCards(); }
      if (S && S.winner && overlay.classList.contains('show')) {
        overlay.querySelector('.win-text').textContent = winnerText();
        const a = S.pieces.A.filter((x) => x === G.OFF).length;
        const b = S.pieces.B.filter((x) => x === G.OFF).length;
        overlay.querySelector('.win-sub').textContent = T('overSub', { a, b });
      }
    });

    // відновлення партії
    const saved = loadSave();
    if (saved) {
      S = saved;
      if (S.mode === 'ai') { // синхронізувати меню з відновленою партією
        cfg.mode = 'ai';
        cfg.side = aiSide() === 'A' ? 'B' : 'A';
        cfg.level = S.aiLevel;
      } else cfg.mode = 'pvp';
      makePieces();
      showScreen('game');
      renderAll();
      toast(T('restored'));
      resumeFlow();
    } else {
      showScreen('menu');
    }
  }

  init();
})();
