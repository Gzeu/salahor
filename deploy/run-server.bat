@echo off
echo Starting WebSocket server...
node minimal-ws-server.js > server.log 2>&1
echo Server stopped. Check server.log for details.
