@echo off
echo Starting WebSocket server on port 4000...
node minimal-ws-server.js > server.log 2>&1
echo Server started. Check server.log for details.
pause
