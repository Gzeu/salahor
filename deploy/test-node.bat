@echo off
echo Testing Node.js installation...
node --version
if %ERRORLEVEL% neq 0 (
    echo Node.js is not installed or not in PATH
    exit /b 1
)

echo.
echo Testing npm installation...
npm --version
if %ERRORLEVEL% neq 0 (
    echo npm is not installed or not in PATH
    exit /b 1
)

echo.
echo All tests passed successfully!
pause
