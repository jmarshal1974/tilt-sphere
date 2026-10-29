@echo off
cd /d "%~dp0"
start "" "http://127.0.0.1:8788"
node server.mjs --port 8788
pause
