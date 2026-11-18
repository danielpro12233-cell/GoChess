@echo off
setlocal
rem Gochess: install the strongest Stockfish 19 builds into public\engine
rem Usage: double-click, or:  install-stockfish.bat [path\to\node_modules\stockfish]
set "DEST=%~dp0public\engine"
set "SRC=%~1"
if not "%SRC%"=="" goto :have
if exist "%CD%\node_modules\stockfish\bin" set "SRC=%CD%\node_modules\stockfish"
if not "%SRC%"=="" goto :have
if exist "%USERPROFILE%\Documents\sf-download\node_modules\stockfish\bin" set "SRC=%USERPROFILE%\Documents\sf-download\node_modules\stockfish"
if not "%SRC%"=="" goto :have
echo No local Stockfish found. Downloading with npm ^(needs Node.js and internet^)...
set "TMPD=%TEMP%\gochess-sf"
if not exist "%TMPD%" mkdir "%TMPD%"
pushd "%TMPD%"
call npm install stockfish --no-audit --no-fund
popd
set "SRC=%TMPD%\node_modules\stockfish"
:have
if not exist "%SRC%\bin\stockfish-19-single.js" (
  echo Could not find "%SRC%\bin\stockfish-19-single.js". Pass the stockfish folder as an argument.
  pause & exit /b 1
)
if not exist "%DEST%" mkdir "%DEST%"
for %%F in (stockfish-19.js stockfish-19.wasm stockfish-19-single.js stockfish-19-single.wasm stockfish-19-lite.js stockfish-19-lite.wasm stockfish-19-lite-single.js stockfish-19-lite-single.wasm) do (
  if exist "%SRC%\bin\%%F" copy /Y "%SRC%\bin\%%F" "%DEST%\%%F" >nul && echo copied %%F
)
if exist "%SRC%\Copying.txt" copy /Y "%SRC%\Copying.txt" "%DEST%\Copying.txt" >nul
echo.
echo Done. Restart the server:  node server\server.js
pause
