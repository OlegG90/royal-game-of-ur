# Royal Game of Ur

A browser implementation of the Sumerian race game (~2600 BC), following Irving Finkel's
rules reconstruction (British Museum).

🎮 **Play:** https://olegg90.github.io/royal-game-of-ur/ · 🧪 dev preview: [`/latest/`](https://olegg90.github.io/royal-game-of-ur/latest/)

Game description and full rules live in Obsidian notes:
`myVault/Hobby/Games/Royal Game of Ur/`.

## Running

A static site with no build step — any HTTP server will do:

```
python -m http.server 8641
# → http://localhost:8641   (the version label shows "dev" locally)
```

Works on desktop and mobile (Android/iOS); controlled by tap/click.

## Tests

The rules engine and AI are covered by Node.js tests, no external dependencies:

```
node --test        # or: npm test
```

`tests/game.test.js` runs the client modules inside a `node:vm` sandbox (15 tests:
moves, captures, central-rosette block, exact bear-off, win, occupancy validation, AI).

## Features

- **Modes**: two-player hotseat, or versus the computer — playing **either side**
  (White or Black; the computer moves first when it plays White).
- **Three AI levels**: easy (random move), medium (heuristic scoring), hard
  (heuristics + a probability-weighted 1-ply look-ahead). A winning move is always taken.
- **Two languages** — Ukrainian / English, switchable in-game; the default follows the
  browser locale and is remembered.
- **Full Finkel ruleset**: 7 pieces, 4 tetrahedral dice (0–4), capturing on the shared
  row, rosettes ✿ 4/8/14 (extra roll + protection), blocking central rosette, exact
  roll required to bear off.
- **Auto-save** to `localStorage` with validation — an interrupted match resumes on reload
  (a "Continue match" entry appears in the menu).
- **Menu screen** (mode / difficulty / side) plus **Intro** and **Rules** dialogs.
- **Authentic board** — SVG in the style of the original artifact excavated at Ur:
  shell plaques, lapis-lazuli and red inlays, 5 rosettes, "eye" and dot patterns;
  white/black disc pieces with 5 dots.
- **Responsive** — desktop, mobile portrait, and mobile landscape layouts.

## Structure

- `index.html` — markup: menu / game screens, SVG board container, Intro & Rules dialogs, victory overlay
- `css/style.css` — styles, dark theme, dice animations, responsive layout (portrait / landscape)
- `js/game.js` — rules engine (state, legal moves, captures, win, occupancy check) — `window.UrGame`
- `js/board.js` — board geometry and SVG rendering — `window.UrBoard`
- `js/ai.js` — heuristic AI, side-independent (plays `state.turn`), 3 difficulty levels — `window.UrAI`
- `js/i18n.js` — UK/EN localization dictionary and switch logic — `window.UrI18n`
- `js/main.js` — UI wiring, animations, screen/state control, `localStorage` persistence
- `tests/game.test.js` — Node.js test suite
- `.github/workflows/pages.yml` — GitHub Pages deploy

## Deployment

Two-track GitHub Pages deploy (GitHub Actions):

- **Stable** (`/`) is built from the release tag (`STABLE_TAG` in the workflow).
- **Latest** (`/latest/`) is built from `main` and labeled "latest" in the UI.

The displayed version has a single source — the deploy tag: `js/main.js` keeps only a
`'dev'` fallback, and CI stamps the real number from the tag at build time. Releasing:
set `STABLE_TAG`, then tag the commit `vX.Y` and push the tag.

## Route notation

Piece position: `0` = start (off the board), `1..14` = route squares, `15` = borne off.
Squares `5..12` form the shared central row (where capturing happens); the rest are private.
