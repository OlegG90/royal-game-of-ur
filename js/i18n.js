/* Локалізація: українська / англійська. Вибір зберігається в localStorage. */
(function () {
  'use strict';

  const KEY = 'gameur-lang';

  const DICT = {
    uk: {
      title: 'Королівська гра Ур',
      subtitle: 'Шумерська гонка · ~2600 р. до н.е. · реконструкція Фінкеля',
      subtitleShort: 'реконструкція Фінкеля',
      // меню
      modeLabel: 'Режим',
      vsAIShort: 'Проти ПК',
      pvpShort: 'На двох',
      difficulty: 'Сила компʼютера',
      levelEasy: 'Легкий',
      levelMedium: 'Середній',
      levelHard: 'Складний',
      sideLabel: 'Ваша сторона',
      white: 'Білі',
      black: 'Чорні',
      startGame: 'Почати гру',
      continueGame: 'Продовжити партію',
      rulesShort: 'Правила',
      rules: 'Правила (коротко)',
      introTitle: 'Інтро',
      intro1: '<b>Королівська гра Ур</b> — одна з найдавніших відомих настільних ігор у світі: гонка двох гравців, попередниця нард. Грі понад <b>4500 років</b>.',
      intro2: 'Ігрові дошки знайшов британський археолог <b>Леонард Вуллі</b> під час розкопок Царського некрополя Ура в Месопотамії (сучасний Ірак) у 1922–1934 роках; вік знахідок — близько 2600–2400 рр. до н.е.',
      intro3: 'Точні правила не збереглися — їх реконструював куратор Британського музею <b>Ірвінг Фінкель</b> за клинописною табличкою ~177 р. до н.е. Саме за цією реконструкцією грає ця гра.',
      wikiGame: 'Королівська гра Ур — Wikipedia ↗',
      wikiFinkel: 'Ірвінг Фінкель — Wikipedia ↗',
      // гра
      newGame: 'Нова гра',
      roll: 'Кинути кубики',
      diceLabel: 'Кубики',
      moveOn: 'хід на',
      computer: 'Компʼютер',
      youWhite: 'Ви · білі',
      youBlack: 'Ви · чорні',
      cpuWhite: 'Компʼютер · білі',
      cpuBlack: 'Компʼютер · чорні',
      diffSub: 'складність: {level}',
      stRolling: 'Кидаємо кубики…',
      stAI: 'Компʼютер ходить…',
      stYourRoll: 'Ваш хід — киньте кубики',
      stPick: 'Оберіть підсвічену фішку',
      stPvpRoll: 'Хід {name} — киньте кубики',
      stPvpPick: 'Хід {name} — оберіть фішку',
      whiteGen: 'білих',
      blackGen: 'чорних',
      // тости
      toastZero: '{name}: випало 0 — хід переходить',
      toastNoMoves: '{name}: немає можливих ходів',
      toastCapture: '{name}: фішку суперника збито!',
      toastBearOff: '{name}: фішка вийшла ({n}/7)',
      toastRosette: '{name}: розетка ✿ — додатковий хід',
      restored: 'Гру відновлено',
      // фінал
      gameOver: 'Гру завершено',
      youWin: 'Ви перемогли',
      cpuWin: 'Компʼютер переміг',
      winPvp: '{name} перемогли',
      overSub: 'Білі {a} · Чорні {b} знятих фішок',
      rematch: 'Реванш',
      toMenu: 'У меню',
      // правила
      gotIt: 'Зрозуміло',
      rule1: 'У кожного гравця <b>7 фішок</b>. Мета — першим провести всі маршрутом і зняти з дошки.',
      rule2: 'Кидок 4 тетраедрів дає <b>0–4</b> кроки. 0 — хід переходить.',
      rule3: 'За кидок — <b>один хід</b>: ввести нову фішку або просунути наявну.',
      rule4: 'Маршрут S-подібний: свій ряд (1–4) → спільний центр (5–12) → свій ряд (13–14) → вихід.',
      rule5: 'На спільному ряду фішка суперника <b>збивається</b> на старт.',
      rule6: 'Розетки ✿ (4, 8, 14): <b>додатковий хід</b> і захист. Центральна (8) блокує суперника.',
      rule7: 'Не можна ставати на свою фішку. Зняття — лише <b>точним</b> кидком.',
      rule8: 'Тап по підсвіченій фішці або клітині-цілі виконує хід.',
      // дошка
      capStart: 'старт',
      capExit: 'вихід',
      boardAria: 'Дошка гри Ур',
    },
    en: {
      title: 'Royal Game of Ur',
      subtitle: 'A Sumerian race game · c. 2600 BC · Finkel’s reconstruction',
      subtitleShort: 'Finkel’s reconstruction',
      modeLabel: 'Mode',
      vsAIShort: 'vs Computer',
      pvpShort: 'Two players',
      difficulty: 'Computer strength',
      levelEasy: 'Easy',
      levelMedium: 'Medium',
      levelHard: 'Hard',
      sideLabel: 'Your side',
      white: 'White',
      black: 'Black',
      startGame: 'Start game',
      continueGame: 'Continue match',
      rulesShort: 'Rules',
      rules: 'Rules (in brief)',
      introTitle: 'Intro',
      intro1: 'The <b>Royal Game of Ur</b> is one of the oldest known board games in the world — a race for two players and a forerunner of backgammon. The game is over <b>4,500 years old</b>.',
      intro2: 'The boards were found by the British archaeologist <b>Leonard Woolley</b> during the excavation of the Royal Cemetery at Ur in Mesopotamia (modern Iraq) in 1922–1934; the finds date to about 2600–2400 BC.',
      intro3: 'The exact rules did not survive — they were reconstructed by British Museum curator <b>Irving Finkel</b> from a cuneiform tablet of c. 177 BC. This game follows that reconstruction.',
      wikiGame: 'Royal Game of Ur — Wikipedia ↗',
      wikiFinkel: 'Irving Finkel — Wikipedia ↗',
      newGame: 'New game',
      roll: 'Roll the dice',
      diceLabel: 'Dice',
      moveOn: 'move',
      computer: 'Computer',
      youWhite: 'You · White',
      youBlack: 'You · Black',
      cpuWhite: 'Computer · White',
      cpuBlack: 'Computer · Black',
      diffSub: 'strength: {level}',
      stRolling: 'Rolling the dice…',
      stAI: 'Computer is thinking…',
      stYourRoll: 'Your turn — roll the dice',
      stPick: 'Pick a highlighted piece',
      stPvpRoll: '{name} to roll',
      stPvpPick: '{name} to move',
      whiteGen: 'White',
      blackGen: 'Black',
      toastZero: '{name}: rolled 0 — turn passes',
      toastNoMoves: '{name}: no legal moves',
      toastCapture: '{name}: captured an opponent’s piece!',
      toastBearOff: '{name}: piece borne off ({n}/7)',
      toastRosette: '{name}: rosette ✿ — extra roll',
      restored: 'Game restored',
      gameOver: 'Game over',
      youWin: 'You win',
      cpuWin: 'Computer wins',
      winPvp: '{name} wins',
      overSub: 'White {a} · Black {b} pieces borne off',
      rematch: 'Rematch',
      toMenu: 'Menu',
      gotIt: 'Got it',
      rule1: 'Each player has <b>7 pieces</b>. Be first to move them all along the route and bear them off.',
      rule2: 'A roll of 4 tetrahedra gives <b>0–4</b> steps. 0 — the turn passes.',
      rule3: 'One roll — <b>one move</b>: enter a new piece or advance one already on the board.',
      rule4: 'The route is S-shaped: your row (1–4) → shared middle row (5–12) → your row (13–14) → off the board.',
      rule5: 'On the shared row an opponent’s piece is <b>captured</b> and sent back to start.',
      rule6: 'Rosettes ✿ (4, 8, 14): an <b>extra roll</b> and protection. The central one (8) blocks the opponent.',
      rule7: 'You can’t land on your own piece. Bearing off requires an <b>exact</b> roll.',
      rule8: 'Tap a highlighted piece or a target square to make the move.',
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
