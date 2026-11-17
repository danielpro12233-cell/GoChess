# Gochess

Chess with a coach. Play Fisher (a mysterious fish in a coat and hat) from Beginner to Super GM, play friends online with a room code, and get every move of a game rated and explained.

**Created by Daniel M Reyes.**

## Run it

You need [Node.js](https://nodejs.org) 18 or newer. There is nothing to install.

```
node server/server.js
```

Open http://localhost:3000. Use `PORT=8080 node server/server.js` to change the port.
To play with a friend on another device, host it somewhere public (see Deploying) and share the room code.

## Features

- Play Fisher at 9 levels (Beginner ~400 to Super GM ~3000), with clocks, drag and click moves, promotion, draws by rule, resign.
- Pass and play on one device.
- Online rooms with a 5-letter code, an open-games lobby, draw offers, a shared leaderboard.
- Guest profiles. No sign-up: a nickname is saved in your browser. Your Elo goes up when you win.
- Game review: every move is rated Brilliant, Great, Best, Excellent, Good, Inaccuracy, Mistake, Miss or Blunder, with a badge on the board, an arrow for the better move, an evaluation bar and graph, accuracy for both sides, and an explanation from Fisher (a short poem plus a plain note).
- Analyze any PGN.
- Four board themes, synthesized sound effects, move animation.

## How the engine works

Gochess picks the strongest engine that works on the device, in this order: Stockfish 19 multi-thread (needs cross-origin isolation, which the server turns on), Stockfish 19 single-thread, Stockfish 19 Lite, Stockfish 10 from cdnjs, then the built-in engine. A small Stockfish 19 Lite is already in `public/engine/`, so it works right after `node server/server.js`. For the full strength, run `install-stockfish.bat` (Windows) or `sh install-stockfish.sh` (Mac/Linux) once; it copies the big builds (about 100 MB each) into `public/engine/`. If nothing loads, Gochess falls back to its own weaker built-in engine (roughly 2000 Elo at best). Levels up to Club (~1300) always use the built-in engine on purpose, because it can imitate human mistakes.

Cross-origin isolation (needed only by the multi-thread build) is OFF by default because it blocks most ad scripts; set `GC_ISOLATE=1` to turn it on, and remove `adScript` from `public/index.html` if you do. Without it Gochess uses the single-thread Stockfish 19, which is still very strong.

### Ads
Before an analysis starts, Gochess shows a short ad screen (10 seconds, then "Start analysis"). It is configured in `public/index.html` via `GC_CFG.adScript`, `adId` and `adSeconds`; delete `adScript` to remove it. The wait is a timer, so it cannot prove the ad was actually seen or loaded (for example with an ad blocker). Stockfish is GPL-3.0 software; see `public/engine/STOCKFISH-LICENSE.txt`.

## Folder layout

```
server/server.js     Node server: static files, rooms and leaderboard (REST + Server-Sent Events)
public/index.html    the app
public/js/engine.js  built-in chess engine (rules, search)
public/js/engines.js engine manager (picks and runs Stockfish)
public/engine/      Stockfish 19 files (WASM)
public/js/analysis.js  move rating and explanations
public/js/coach.js   Fisher artwork and poems
public/js/netdb.js   client for the server
public/js/app.js     UI and game logic
data/db.json         created at runtime (rooms, players)
```

## Deploying

Any host that runs Node works (Render, Railway, Fly.io, a VPS). Start command: `node server/server.js`. The server reads `PORT`. Set `DATA_DIR` to a persistent disk if you want the leaderboard to survive restarts.

## Known limits

- Elo and results are reported by the players' browsers, so a determined cheater could fake them. For a serious public ladder, move the rating update and move validation to the server.
- The server keeps data in memory and saves it to a JSON file. That is fine for a few hundred players, not for thousands.
- Brilliant and Great moves are detected from the engine's evaluation and a material check, so they can differ from other sites.
