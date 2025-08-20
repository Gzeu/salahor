@echo off
echo Starting WebSocket server...
start "WebSocket Server" cmd /k "node clean-server.js"

timeout /t 2 /nobreak >nul

echo Starting HTTP server...
start "HTTP Server" cmd /k "node serve.js"

echo.
echo Servers started in new windows.
echo Access the test client at: http://localhost:8080/test-client.html
echo WebSocket server is running on: ws://localhost:4000

pause
