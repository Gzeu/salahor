@echo off
setlocal enabledelayedexpansion

:: Configuration
set APP_NAME=websocket-server
set NODE_ENV=production

:: Check if PM2 is installed
where pm2 >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo PM2 is not installed. Installing...
    npm install -g pm2
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to install PM2
        exit /b 1
    )
)

:: Install dependencies
echo Installing dependencies...
npm install --production
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install dependencies
    exit /b 1
)

:: Stop existing instance if running
pm2 delete %APP_NAME% >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Stopped existing %APP_NAME% instance
)

:: Start the application
echo Starting %APP_NAME%...
set PM2_HOME=%USERPROFILE%\.pm2

pm2 start ecosystem.config.cjs --env production
if %ERRORLEVEL% NEQ 0 (
    echo Failed to start %APP_NAME%
    exit /b 1
)

:: Save PM2 process list
echo Saving PM2 process list...
pm2 save

:: Set up PM2 to start on system boot
echo Setting up PM2 startup...
pm2 startup
pm2 save

echo %APP_NAME% deployed successfully!
echo PM2 Status: pm2 list
echo View logs: pm2 logs %APP_NAME%
