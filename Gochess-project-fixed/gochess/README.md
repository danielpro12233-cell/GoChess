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

The browser loads **Stockfish 10** (Stockfish.js, asm.js build) from cdnjs in a Web Worker and uses it for the review and for the stronger Fisher levels. If it cannot be loaded (offline, blocked), Gochess falls back to its own built-in alpha-beta engine, which is much weaker (roughly 2000 Elo at best), and the app tells you which engine is active. Levels up to Club (~1300) always use the built-in engine on purpose, because it can imitate human mistakes.

If you need it fully offline, download `stockfish.js` and set `sfUrl` in `window.GC_CFG` (in `public/index.html`) to your local copy. Stockfish is GPL-3.0 software, so check its license before bundling it.

## Folder layout

```
server/server.js     Node server: static files, rooms and leaderboard (REST + Server-Sent Events)
public/index.html    the app
public/js/engine.js  built-in chess engine (rules, search)
public/js/engines.js Stockfish loader and engine manager
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
