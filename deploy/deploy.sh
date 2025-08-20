#!/bin/bash
set -e

# Configuration
APP_NAME="websocket-server"
APP_PORT=4000
NODE_ENV=${NODE_ENV:-production}
PM2_APP_NAME="websocket-server"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 is not installed. Installing..."
    npm install -g pm2
fi

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Stop existing instance if running
if pm2 list | grep -q $PM2_APP_NAME; then
    echo "Stopping existing $PM2_APP_NAME..."
    pm2 stop $PM2_APP_NAME
    pm2 delete $PM2_APP_NAME
fi

# Start the application
echo "Starting $APP_NAME..."
NODE_ENV=$NODE_ENV pm2 start ecosystem.config.js --env production

# Save PM2 process list
echo "Saving PM2 process list..."
pm2 save

# Set up PM2 to start on system boot
if [ "$NODE_ENV" = "production" ]; then
    echo "Setting up PM2 startup..."
    pm2 startup
    pm2 save
fi

echo "$APP_NAME deployed successfully!"
echo "Application URL: http://localhost:$APP_PORT"
echo "PM2 Status: pm2 list"
