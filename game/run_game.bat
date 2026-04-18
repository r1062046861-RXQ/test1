@echo off
echo Starting Five Elements Medical Way...
echo Please ensure you have Node.js or Python installed.

where npx >nul 2>nul
if %errorlevel%==0 (
    echo Using Node.js - npx serve...
    echo Opening http://localhost:3000
    start http://localhost:3000
    call npx --yes serve -s dist -l 3000
    pause
    exit
)

where python >nul 2>nul
if %errorlevel%==0 (
    echo Using Python...
    echo Opening http://localhost:8000
    start http://localhost:8000
    cd dist
    python -m http.server 8000
    pause
    exit
)

echo Error: Neither Node.js nor Python found. Please install one of them to run the game.
pause
