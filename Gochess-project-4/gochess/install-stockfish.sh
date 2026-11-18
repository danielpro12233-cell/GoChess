#!/usr/bin/env sh
# Gochess: install the strongest Stockfish 19 builds into public/engine
# Usage: sh install-stockfish.sh [path/to/node_modules/stockfish]
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; DEST="$HERE/public/engine"; SRC="$1"
[ -z "$SRC" ] && [ -d "./node_modules/stockfish/bin" ] && SRC="./node_modules/stockfish"
if [ -z "$SRC" ]; then
  echo "Downloading Stockfish with npm..."
  TMPD="$(mktemp -d)"; (cd "$TMPD" && npm install stockfish --no-audit --no-fund); SRC="$TMPD/node_modules/stockfish"
fi
[ -f "$SRC/bin/stockfish-19-single.js" ] || { echo "Missing $SRC/bin/stockfish-19-single.js"; exit 1; }
mkdir -p "$DEST"
for f in stockfish-19.js stockfish-19.wasm stockfish-19-single.js stockfish-19-single.wasm stockfish-19-lite.js stockfish-19-lite.wasm stockfish-19-lite-single.js stockfish-19-lite-single.wasm; do
  [ -f "$SRC/bin/$f" ] && cp "$SRC/bin/$f" "$DEST/$f" && echo "copied $f"
done
[ -f "$SRC/Copying.txt" ] && cp "$SRC/Copying.txt" "$DEST/Copying.txt"
echo "Done. Restart the server: node server/server.js"
