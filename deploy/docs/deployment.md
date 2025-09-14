# Deployment Guide

## Prerequisites
- Node.js 16.0.0 or higher
- PM2 (for production deployment)
- Nginx (recommended for production)

## Quick Deployment

### 1. Install Dependencies
```bash
# Install production dependencies only
npm install --omit=dev

# Install PM2 globally
npm install -g pm2
```

### 2. Start the Server
```bash
# Start in development mode
npm run dev

# Start in production mode
NODE_ENV=production npm start

# Or using PM2 for production
pm2 start ecosystem.config.js
```

## Production Deployment with PM2

### 1. Configure PM2
Create or modify `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'salahor-websocket',
    script: './clean-server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4002
    },
    max_memory_restart: '1G',
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
```

### 2. Start with PM2
```bash
# Start the application
pm2 start ecosystem.config.js

# Save the process list
pm2 save

# Generate startup script
pm2 startup

# Save the process list again after setting up startup
pm2 save
```

## Using Nginx as Reverse Proxy

### 1. Install Nginx
```bash
# On Ubuntu/Debian
sudo apt update
sudo apt install nginx

# On CentOS/RHEL
sudo yum install nginx
```

### 2. Configure Nginx
Create a new configuration file at `/etc/nginx/sites-available/salahor-websocket`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /ws {
        proxy_pass http://localhost:4002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Optional: Serve static files
    location / {
        root /path/to/static/files;
        try_files $uri /index.html;
    }
}
```

### 3. Enable the Site
```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/salahor-websocket /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Docker Deployment

### 1. Create a Dockerfile
```dockerfile
FROM node:16-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy source code
COPY . .

# Expose the port
EXPOSE 4002

# Start the server
CMD ["node", "clean-server.js"]
```

### 2. Build and Run
```bash
# Build the image
docker build -t salahor-websocket .

# Run the container
docker run -d \
  --name salahor-ws \
  -p 4002:4002 \
  -e NODE_ENV=production \
  salahor-websocket
```

## Monitoring and Maintenance

### PM2 Commands
```bash
# View logs
pm2 logs salahor-websocket

# Monitor resource usage
pm2 monit

# Show application info
pm2 show salahor-websocket

# Restart the application
pm2 restart salahor-websocket

# Stop the application
pm2 stop salahor-websocket

# Delete from PM2
pm2 delete salahor-websocket
```

### Log Rotation
Add to your PM2 configuration:
```javascript
module.exports = {
  apps: [{
    // ... other config
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    log_type: 'json',
    log_file: 'combined.log',
    out_file: 'logs/out.log',
    error_file: 'logs/error.log',
    merge_logs: true,
    log_rotate: {
      max_size: '10M',
      retain: 7,
      compress: true,
      datePattern: 'YYYY-MM-DD',
      rotateModule: true
    }
  }]
};
```

## Security Considerations

1. **Enable HTTPS**
   - Use Let's Encrypt for free SSL certificates
   - Configure Nginx to handle SSL termination

2. **Authentication**
   - Implement token-based authentication
   - Use secure WebSocket connections (wss://)

3. **Rate Limiting**
   - Configure rate limiting in Nginx
   - Implement connection limits in your application

4. **Firewall**
   - Only expose necessary ports (80, 443)
   - Use a firewall to restrict access

## Troubleshooting

### Common Issues
1. **Connection refused**
   - Check if the server is running
   - Verify the port is not blocked by a firewall

2. **WebSocket connection fails**
   - Ensure the WebSocket endpoint is correct
   - Check Nginx configuration for WebSocket support

3. **High memory usage**
   - Monitor memory usage with `pm2 monit`
   - Consider scaling horizontally with multiple instances

4. **Connection drops**
   - Check for network issues
   - Implement reconnection logic in the client

For additional help, refer to the [troubleshooting guide](./troubleshooting.md) or open an issue on GitHub.
