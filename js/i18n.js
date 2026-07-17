/* Локалізація: українська / англійська. Вибір зберігається в localStorage. */
(function () {
  'use strict';

  const KEY = 'gameur-lang';

  const DICT = {
    uk: {
      title: 'Королівська гра Ур',
      subtitle: 'Шумерська гонка, ~2600 р. до н.е. · реконструкція Ірвінга Фінкеля',
      roll: 'Кинути кубики',
      newGame: 'Нова гра',
      rules: 'Правила',
      chooseMode: 'Оберіть режим:',
      difficulty: 'Сила компʼютера:',
      levelEasy: 'Легкий',
      levelMedium: 'Середній',
      levelHard: 'Складний',
      vsAIWhite: 'Проти компʼютера — білими',
      vsAIBlack: 'Проти компʼютера — чорними',
      pvp: 'Гра на двох',
      cancel: 'Скасувати',
      gotIt: 'Зрозуміло',
      rulesTitle: 'Правила (коротко)',
      rule1: 'У кожного гравця <b>7 фішок</b>. Мета — першим провести всі маршрутом і зняти з дошки.',
      rule2: 'Кидок 4 тетраедрів дає <b>0–4</b> кроки. 0 — хід переходить.',
      rule3: 'За кидок — <b>один хід</b>: ввести нову фішку або просунути наявну.',
      rule4: 'Маршрут S-подібний: свій ряд (1–4) → спільний центр (5–12) → свій ряд (13–14) → вихід.',
      rule5: 'На спільному ряду фішка суперника <b>збивається</b> на старт.',
      rule6: 'Розетки ✿ (4, 8, 14): <b>додатковий хід</b> і захист. Центральна (8) блокує суперника.',
      rule7: 'Не можна ставати на свою фішку. Зняття — лише <b>точним</b> кидком.',
      rule8: 'Тап по підсвіченій фішці або клітині-цілі виконує хід.',
      diceHint: 'кидайте кубики',
      white: 'Білі',
      black: 'Чорні',
      computer: 'Компʼютер',
      toastZero: '{name}: випало 0 — хід переходить',
      toastNoMoves: '{name}: немає можливих ходів',
      toastCapture: '{name}: фішку суперника збито!',
      toastBearOff: '{name}: фішка вийшла ({n}/7)',
      toastRosette: '{name}: розетка ✿ — додатковий хід',
      win: '{name} — перемога!',
      restored: 'Гру відновлено',
      newGameStart: 'Нова гра. Починають білі.',
      capStart: 'старт',
      capExit: 'вихід',
      boardAria: 'Дошка гри Ур',
    },
    en: {
      title: 'Royal Game of Ur',
      subtitle: 'A Sumerian race game, c. 2600 BC · Irving Finkel’s reconstruction',
      roll: 'Roll the dice',
      newGame: 'New game',
      rules: 'Rules',
      chooseMode: 'Choose a mode:',
      difficulty: 'Computer strength:',
      levelEasy: 'Easy',
      levelMedium: 'Medium',
      levelHard: 'Hard',
      vsAIWhite: 'vs Computer — as White',
      vsAIBlack: 'vs Computer — as Black',
      pvp: 'Two players',
      cancel: 'Cancel',
      gotIt: 'Got it',
      rulesTitle: 'Rules (in brief)',
      rule1: 'Each player has <b>7 pieces</b>. Be first to move them all along the route and bear them off.',
      rule2: 'A roll of 4 tetrahedra gives <b>0–4</b> steps. 0 — the turn passes.',
      rule3: 'One roll — <b>one move</b>: enter a new piece or advance one already on the board.',
      rule4: 'The route is S-shaped: your row (1–4) → shared middle row (5–12) → your row (13–14) → off the board.',
      rule5: 'On the shared row an opponent’s piece is <b>captured</b> and sent back to start.',
      rule6: 'Rosettes ✿ (4, 8, 14): an <b>extra roll</b> and protection. The central one (8) blocks the opponent.',
      rule7: 'You can’t land on your own piece. Bearing off requires an <b>exact</b> roll.',
      rule8: 'Tap a highlighted piece or a target square to make the move.',
      diceHint: 'roll the dice',
      white: 'White',
      black: 'Black',
      computer: 'Computer',
      toastZero: '{name}: rolled 0 — turn passes',
      toastNoMoves: '{name}: no legal moves',
      toastCapture: '{name}: captured an opponent’s piece!',
      toastBearOff: '{name}: piece borne off ({n}/7)',
      toastRosette: '{name}: rosette ✿ — extra roll',
      win: '{name} wins!',
      restored: 'Game restored',
      newGameStart: 'New game. White moves first.',
      capStart: 'start',
      capExit: 'exit',
      boardAria: 'Game of Ur board',
    },
  };

  let lang;
  try { lang = localStorage.getItem(KEY); } catch (e) { /* ignore */ }
  if (lang !== 'uk' && lang !== 'en') {
    lang = (navigator.language || '').toLowerCase().startsWith('uk') ? 'uk' : 'en';
  }

  function t(key, vars) {
    let s = (DICT[lang] && DICT[lang][key]) || DICT.uk[key] || key;
    if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
    return s;
  }

  // Оновити всі статичні написи (HTML і SVG) та активність перемикача
  function apply() {
    document.documentElement.lang = lang;
    document.title = t('title');
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
    document.querySelectorAll('.lang-switch [data-lang]').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-lang') === lang);
    });
  }

  function setLang(l) {
    if (l !== 'uk' && l !== 'en') return;
    lang = l;
    try { localStorage.setItem(KEY, l); } catch (e) { /* ignore */ }
    apply();
    window.dispatchEvent(new CustomEvent('gameur:lang'));
  }

  document.querySelectorAll('.lang-switch [data-lang]').forEach((b) =>
    b.addEventListener('click', () => setLang(b.getAttribute('data-lang'))));

  apply();

  window.UrI18n = { t, setLang, get lang() { return lang; } };
})();
