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
- Fisher speaks English or Tagalog (Profile settings, the home card, or the EN/TL switch on Fisher's bubble). Poems, table talk and every move explanation are written in both languages, so switching is instant, even in a finished review.
- Premoves: while the other side is thinking, queue as many moves as you like (numbered on the board). Each is picked on a board where the earlier ones are already played. When it is your turn they are played in order; if one is no longer legal the queue is dropped. Right-click, Esc or the Clear button cancels.
- The review always starts from the beginning: the pieces glide back to the starting position and Fisher introduces the game. Jumping far in the move list glides the pieces too.
- Analyze any PGN.
- Four board themes, synthesized sound effects, move animation.

## How the engine works

Gochess picks the strongest engine that works on the device, in this order: Stockfish 19 multi-thread (needs cross-origin isolation, which the server turns on), Stockfish 19 single-thread, Stockfish 19 Lite, Stockfish 10 from cdnjs, then the built-in engine. A small Stockfish 19 Lite is already in `public/engine/`, so it works right after `node server/server.js`. For the full strength, run `install-stockfish.bat` (Windows) or `sh install-stockfish.sh` (Mac/Linux) once; it copies the big builds (about 100 MB each) into `public/engine/`. If nothing loads, Gochess falls back to its own weaker built-in engine (roughly 2000 Elo at best). Levels up to Club (~1300) always use the built-in engine on purpose, because it can imitate human mistakes.

Cross-origin isolation is now OFF by default because it blocks third-party scripts (Google sign-in and ads). Set `GC_ISOLATE=1` to turn it on only if you install the multi-thread build and use neither of those. Stockfish is GPL-3.0 software; see `public/engine/STOCKFISH-LICENSE.txt`.

## Google sign-in and the leaderboards

Players can play as guests or sign in with Google. A signed-in player keeps the same rating on every device and appears on the **Google accounts** leaderboard. Guests appear on the **Guests** leaderboard. Emails are never shown or sent to other players.

To switch Google sign-in on (about 5 minutes, free):

1. Open https://console.cloud.google.com/apis/credentials and create an **OAuth client ID** of type **Web application**.
2. Under **Authorized JavaScript origins** add your site address (for example `https://your-site.com`, and `http://localhost:3000` for testing).
3. Give the server the client ID, either with the environment variable `GOOGLE_CLIENT_ID=...apps.googleusercontent.com` or by copying `config.example.json` to `config.json` and filling it in.
4. Restart the server. The Profile window now shows a "Sign in with Google" button.

Until a client ID is set, the app works as before and simply says Google sign-in is not set up.

## Keeping the leaderboards safe

- Data is saved to `DATA_DIR/db.json`. Before every save the previous file is copied to `db.json.bak`, and a daily snapshot is kept in `DATA_DIR/backups/` for two weeks. If `db.json` is ever damaged, the server restores itself from the newest good copy and keeps the damaged file for inspection.
- **Set `DATA_DIR` to a persistent disk or volume.** On hosts with a temporary file system (Render free tier, Railway without a volume, Heroku) the folder is wiped on every deploy or restart, and no code can prevent that.
- Accounts, sessions and the account leaderboard can only be changed by the server. The generic database API refuses direct writes to them.

## Opening book and the coach

`public/js/openings.js` holds about 330 named opening lines (Italian, Ruy Lopez, Sicilian, French, Caro-Kann, Queen's Gambit, Indian defenses, English, Reti and more). A move whose resulting position is in the book is marked with the book icon, in the live game and in the review, and the opening name is shown. Positions are matched, so transpositions are recognised. To add an opening, add a line such as `"Name|e4 e5 Nf3 ..."` to the `LINES` list (the console warns if a move is illegal).

`public/js/insight.js` finds the ideas behind each move (cornered pieces, forks, pins, free or unprotected pieces, escapes, opening principles) and the review turns them into plain explanations and a short tip.

## Folder layout

```
server/server.js     Node server: static files, rooms and leaderboard (REST + Server-Sent Events)
public/index.html    the app
public/js/engine.js  built-in chess engine (rules, search)
public/js/engines.js engine manager (picks and runs Stockfish)
public/engine/      Stockfish 19 files (WASM)
public/js/analysis.js  move rating and explanations
public/js/coach.js   Fisher artwork and English poems
public/js/coach-tl.js   Fisher's Tagalog poems and table talk
public/js/analysis-tl.js   Tagalog move explanations
public/js/netdb.js   client for the server
public/js/app.js     UI and game logic
data/db.json         created at runtime (rooms, players)
```

## Deploying

Any host that runs Node works (Render, Railway, Fly.io, a VPS). Start command: `node server/server.js`. The server reads `PORT`. Set `DATA_DIR` to a persistent disk if you want the leaderboard to survive restarts.

## Known limits

- Elo and results are reported by the players' browsers, so a determined cheater could fake them. Google accounts are protected a little more: the server only accepts a rating change together with a played game and caps how far it can move in one save. For a serious public ladder, move the rating update and move validation to the server.
- The server keeps data in memory and saves it to a JSON file. That is fine for a few hundred players, not for thousands.
- Brilliant and Great moves are detected from the engine's evaluation and a material check, so they can differ from other sites.
