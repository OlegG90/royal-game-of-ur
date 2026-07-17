/* Дошка Ур — SVG-рендер у стилі оригіналу з Царського некрополя Ура
 * (Британський музей): плакетки з мушлі, лазурит, червоний вапняк.
 * Сітка: 3 ряди × 8 колонок, виріз у рядах 0 і 2 на колонках 4–5.
 * Розетки (як на артефакті): (0,0) (2,0) (1,3) (0,6) (2,6).
 */
(function () {
  'use strict';

  const CELL = 76, GAP = 6, M = 26;
  const colX = (c) => M + c * (CELL + GAP);
  const rowY = (r) => M + r * (CELL + GAP);
  const W = M * 2 + 8 * CELL + 7 * GAP; // 702
  const H = M * 2 + 3 * CELL + 2 * GAP; // 292

  // Кольори артефакту
  const C = {
    wood: '#5a3d22', woodDark: '#3a2512', woodEdge: '#241407',
    shell: '#efe4c9', shellEdge: '#cdbd97',
    lapis: '#274a8f', lapisDark: '#1b3468',
    red: '#a63b2a',
    black: '#2a2320',
  };

  // Маршрут → клітина сітки. Приватний ряд: A → 0, B → 2.
  function gridFor(player, r) {
    const priv = player === 'A' ? 0 : 2;
    if (r <= 4) return { row: priv, col: 4 - r };        // 1..4 → col 3..0
    if (r <= 12) return { row: 1, col: r - 5 };          // 5..12 → col 0..7
    return { row: priv, col: r === 13 ? 7 : 6 };         // 13 → col 7, 14 → col 6
  }

  function center(player, r) {
    const g = gridFor(player, r);
    return { x: colX(g.col) + CELL / 2, y: rowY(g.row) + CELL / 2 };
  }

  // Слоти для фішок поза дошкою — у вирізі (ряд гравця, колонки 4–5).
  // Старт — ліворуч (біля клітини входу), вихід — праворуч (біля клітини 14).
  function poolSlot(player, kind, i) {
    const row = player === 'A' ? 0 : 2;
    const y = rowY(row) + CELL / 2;
    const leftEdge = colX(3) + CELL + 10;   // правий край col3 + відступ
    const rightEdge = colX(6) - 10;         // лівий край col6 - відступ
    if (kind === 'start') return { x: leftEdge + 20 + i * 13, y };
    return { x: rightEdge - 20 - i * 13, y };
  }

  // Типи плакеток за клітинами сітки (наближено до артефакту)
  const PATTERN = {
    '0,0': 'rosette', '0,1': 'eyes', '0,2': 'dots5', '0,3': 'eyes4',
    '0,6': 'rosette', '0,7': 'eyes',
    '1,0': 'dots5', '1,1': 'dots12', '1,2': 'eyes', '1,3': 'rosette',
    '1,4': 'dots5', '1,5': 'zigzag', '1,6': 'dots12', '1,7': 'dots5',
    '2,0': 'rosette', '2,1': 'eyes', '2,2': 'dots5', '2,3': 'eyes4',
    '2,6': 'rosette', '2,7': 'eyes',
  };

  const NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs, parent) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // ---- Малювання плакеток ----

  function drawRosette(g, cx, cy) {
    const petals = 8;
    for (let k = 0; k < petals; k++) {
      const a = (k * 360) / petals;
      const petal = el('path', {
        d: 'M0 -8 C 5 -14, 5 -24, 0 -27 C -5 -24, -5 -14, 0 -8 Z',
        fill: k % 2 ? C.red : C.lapis,
        transform: `translate(${cx} ${cy}) rotate(${a})`,
      }, g);
      petal.setAttribute('stroke', C.shellEdge);
      petal.setAttribute('stroke-width', '0.6');
    }
    el('circle', { cx, cy, r: 8.5, fill: C.lapis }, g);
    el('circle', { cx, cy, r: 5, fill: C.shell }, g);
    el('circle', { cx, cy, r: 2.2, fill: C.red }, g);
  }

  function drawEye(g, cx, cy, s) {
    el('path', {
      d: `M${cx - s} ${cy} Q ${cx} ${cy - s * 0.9} ${cx + s} ${cy} Q ${cx} ${cy + s * 0.9} ${cx - s} ${cy} Z`,
      fill: '#fff', stroke: C.lapis, 'stroke-width': 1.6,
    }, g);
    el('circle', { cx, cy, r: s * 0.34, fill: C.lapis }, g);
    el('circle', { cx, cy, r: s * 0.14, fill: C.red }, g);
  }

  function drawEyes(g, cx, cy) {      // 4 маленькі ока 2×2
    const d = 16;
    drawEye(g, cx - d, cy - d, 11);
    drawEye(g, cx + d, cy - d, 11);
    drawEye(g, cx - d, cy + d, 11);
    drawEye(g, cx + d, cy + d, 11);
  }

  function drawEyes4(g, cx, cy) {     // 2 великі ока вертикально
    drawEye(g, cx, cy - 15, 16);
    drawEye(g, cx, cy + 15, 16);
  }

  function drawDots5(g, cx, cy) {     // квінкункс
    const d = 17;
    const pts = [[0, 0], [-d, -d], [d, -d], [-d, d], [d, d]];
    for (const [dx, dy] of pts) {
      el('circle', { cx: cx + dx, cy: cy + dy, r: 6.5, fill: C.lapis, stroke: C.red, 'stroke-width': 2 }, g);
    }
  }

  function drawDots12(g, cx, cy) {    // сітка 4×3
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        el('circle', {
          cx: cx - 21 + i * 14, cy: cy - 14 + j * 14, r: 4.4,
          fill: (i + j) % 2 ? C.red : C.lapis,
        }, g);
      }
    }
  }

  function drawZigzag(g, cx, cy) {
    for (const off of [-13, 13]) {
      let d = `M${cx + off - 8} ${cy - 26}`;
      for (let i = 0; i < 4; i++) {
        d += ` L${cx + off + 8} ${cy - 26 + (i * 2 + 1) * 6.5} L${cx + off - 8} ${cy - 26 + (i + 1) * 13}`;
      }
      el('path', { d, fill: 'none', stroke: C.lapis, 'stroke-width': 3.4, 'stroke-linejoin': 'round' }, g);
    }
  }

  const DRAW = {
    rosette: drawRosette, eyes: drawEyes, eyes4: drawEyes4,
    dots5: drawDots5, dots12: drawDots12, zigzag: drawZigzag,
  };

  // ---- Побудова дошки ----

  function build(svg) {
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = '';

    const defs = el('defs', {}, svg);
    const grad = el('linearGradient', { id: 'wood', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': C.wood }, grad);
    el('stop', { offset: 1, 'stop-color': C.woodDark }, grad);
    const shellGrad = el('linearGradient', { id: 'shellg', x1: 0, y1: 0, x2: 0.4, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#f6eeda' }, shellGrad);
    el('stop', { offset: 1, 'stop-color': C.shell }, shellGrad);

    // Силует: великий блок (col 0–3), місток (col 4–5, ряд 1), малий блок (col 6–7)
    const pad = 12;
    const frames = [
      { x: colX(0) - pad, y: rowY(0) - pad, w: 4 * CELL + 3 * GAP + 2 * pad, h: 3 * CELL + 2 * GAP + 2 * pad },
      { x: colX(3) + CELL, y: rowY(1) - pad, w: colX(6) - colX(3) - CELL, h: CELL + 2 * pad },
      { x: colX(6) - pad, y: rowY(0) - pad, w: 2 * CELL + GAP + 2 * pad, h: 3 * CELL + 2 * GAP + 2 * pad },
    ];
    const frameLayer = el('g', {}, svg);
    // спершу з обводкою, потім заливки поверх — ховаємо внутрішні шви
    for (const f of frames) {
      el('rect', { x: f.x, y: f.y, width: f.w, height: f.h, rx: 10, fill: 'url(#wood)', stroke: C.woodEdge, 'stroke-width': 4 }, frameLayer);
    }
    for (const f of frames) {
      el('rect', { x: f.x + 1, y: f.y + 1, width: f.w - 2, height: f.h - 2, rx: 9, fill: 'url(#wood)' }, frameLayer);
    }

    // Плакетки
    const cellsLayer = el('g', {}, svg);
    for (const key in PATTERN) {
      const [r, c] = key.split(',').map(Number);
      const x = colX(c), y = rowY(r);
      el('rect', {
        x, y, width: CELL, height: CELL, rx: 4,
        fill: 'url(#shellg)', stroke: C.shellEdge, 'stroke-width': 2,
      }, cellsLayer);
      // тонка лазуритова рамка-інкрустація
      el('rect', {
        x: x + 4, y: y + 4, width: CELL - 8, height: CELL - 8, rx: 2,
        fill: 'none', stroke: C.lapisDark, 'stroke-width': 1.2, opacity: 0.55,
      }, cellsLayer);
      DRAW[PATTERN[key]](cellsLayer, x + CELL / 2, y + CELL / 2);
    }

    // Підписи зон у вирізах
    const capLayer = el('g', {}, svg);
    for (const player of ['A', 'B']) {
      const row = player === 'A' ? 0 : 2;
      const y = rowY(row) + (player === 'A' ? 12 : CELL - 5);
      el('text', {
        x: colX(4) + 6, y, fill: '#c9b389', 'font-size': 11, opacity: 0.85,
        'font-family': 'inherit', 'data-i18n': 'capStart',
      }, capLayer).textContent = window.UrI18n.t('capStart');
      el('text', {
        x: colX(6) - 16, y, fill: '#c9b389', 'font-size': 11, opacity: 0.85,
        'text-anchor': 'end', 'font-family': 'inherit', 'data-i18n': 'capExit',
      }, capLayer).textContent = window.UrI18n.t('capExit');
    }

    // Прозорі клік-зони клітин (для ходу тапом по цілі)
    const hitLayer = el('g', {}, svg);
    const addHit = (id, r, c) => {
      el('rect', {
        x: colX(c), y: rowY(r), width: CELL, height: CELL,
        fill: 'transparent', 'data-cell': id, class: 'hit',
      }, hitLayer);
    };
    for (const p of ['A', 'B']) {
      for (const r of [1, 2, 3, 4, 13, 14]) {
        const g = gridFor(p, r);
        addHit(p + r, g.row, g.col);
      }
    }
    for (let r = 5; r <= 12; r++) {
      const g = gridFor('A', r);
      addHit('M' + r, g.row, g.col);
    }

    // Шари для підсвіток і фішок
    const hlLayer = el('g', { id: 'hl-layer' }, svg);
    const pieceLayer = el('g', { id: 'piece-layer' }, svg);
    return { hlLayer, pieceLayer, hitLayer };
  }

  window.UrBoard = { CELL, W, H, colors: C, gridFor, center, poolSlot, build, el };
})();
