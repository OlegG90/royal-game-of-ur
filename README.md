# Royal Game of Ur

A browser implementation of the Sumerian race game (~2600 BC), following Irving Finkel's
rules reconstruction (British Museum).

Game description and full rules live in Obsidian notes:
`myVault/Hobby/Games/Royal Game of Ur/` (task: `myVault/Projects/GameUr/Task.md`).

## Running

A static site with no build step — any HTTP server will do:

```
python -m http.server 8641
# → http://localhost:8641
```

Works on desktop and mobile (Android/iOS); controlled by tap/click.

## Features

- Modes: two-player hotseat and versus the computer (heuristic AI).
- Full Finkel ruleset: 7 pieces, 4 tetrahedral dice (0–4), capturing on the shared
  row, rosettes ✿ 4/8/14 (extra roll, protection), blocking central rosette, exact
  roll required to bear off.
- Auto-saves game state to `localStorage` — an interrupted match resumes on reload.
- Board rendered as SVG in the style of the original artifact excavated at Ur:
  shell plaques, lapis lazuli and red limestone inlays, 5 rosettes, "eyes" and
  dotted patterns; pieces are white and black discs with 5 dots, as found in the
  excavations.

## Structure

- `index.html` — markup, dialogs (new game, rules)
- `css/style.css` — styles, responsive layout (portrait/landscape)
- `js/game.js` — rules engine (state, legal moves, move application)
- `js/board.js` — board geometry and SVG rendering
- `js/ai.js` — heuristic AI (plays black)
- `js/main.js` — UI, interaction, persistence

## Tests

The rules engine is covered by Node.js tests with no external dependencies:

```
node --test
# or, if npm is available:
npm test
```

Tests live in `tests/game.test.js` and cover the initial state, dice rolls, legal
moves, capturing, the central-rosette block, exact bear-off, the extra roll on a
rosette, probability-weighted AI evaluation, and the win condition.

## Route notation

Piece position: `0` = start (off the board), `1..14` = route squares, `15` = borne off.
Squares `5..12` form the shared central row (where capturing happens); the rest are private.
