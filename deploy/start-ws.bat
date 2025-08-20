@echo off
echo Starting WebSocket server...
node ws-server.js > server.log 2>&1
echo Server started. Check server.log for details.
echo.
echo Test the server by opening:
echo http://localhost:4000/simple-test.html
pause
