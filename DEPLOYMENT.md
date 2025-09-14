# 🚀 Salahor WebSocket Server Deployment Guide

## 📋 Pre-requisites

- Node.js 18 or higher
- pnpm 8 or higher
- Git
- Process Manager (PM2 recommended for production)
- Reverse Proxy (Nginx, Caddy, or similar recommended for production)

## 🏗️ Project Structure

```
deploy/
├── server.js           # Main WebSocket server
├── combined-server.js  # Combined HTTP + WebSocket server
├── debug-server.js     # Debug server with additional logging
├── test-client.js      # Test client for WebSocket
├── test-connection.js  # Connection test script
└── test.html          # Web client test page
```

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Gzeu/salahor.git
cd salahor
```

### 2. Install Dependencies

```bash
# Install pnpm if not already installed
npm install -g pnpm

# Install project dependencies
pnpm install

# Build all packages
pnpm build
```

### 3. Configure Environment

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

### 4. Start the Server

#### Development Mode

```bash
# Start the development server with hot-reload
cd deploy
pnpm dev
```

#### Production Mode

```bash
# Build the project first
pnpm build

# Start the production server
cd deploy
pnpm start
```

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Runtime environment (`development`, `production`) |
| `PORT` | `3000` | Port to listen on |
| `HOST` | `0.0.0.0` | Host to bind to |
| `WS_PATH` | `/` | WebSocket endpoint path |
| `LOG_LEVEL` | `info` | Logging level (`error`, `warn`, `info`, `debug`, `trace`) |
| `MAX_PAYLOAD` | `1048576` | Maximum message size in bytes |
| `CORS_ORIGIN` | `*` | Allowed CORS origins |

### PM2 Configuration (Recommended for Production)

Create `ecosystem.config.js` in the project root:

```javascript
module.exports = {
  apps: [{
    name: 'salahor-ws',
    script: './deploy/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

Start with PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Enable startup on system boot
pm2 startup
pm2 save
```

## 🔄 Reverse Proxy Setup (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        root /path/to/your/static/files;
        try_files $uri /index.html;
    }
}
```

## 🧪 Testing

### Test WebSocket Server

```bash
# Start test client
cd deploy
node test-client.js

# Or test HTTP server
node test-server.js
```

### Test Web Client

1. Start the server
2. Open `http://localhost:3000/test.html` in your browser

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

### PM2 Monitoring

```bash
# Show logs
pm2 logs

# Show metrics
pm2 monit

# Show process list
pm2 list
```

## 🔄 Deployment Workflow

1. **Development**
   - Use `pnpm dev` for development with hot-reload
   - Test using the test client and web interface

2. **Staging**
   - Deploy to staging environment
   - Run integration tests
   - Perform load testing

3. **Production**
   - Deploy using PM2
   - Monitor logs and metrics
   - Set up alerts for critical errors

## 🔒 Security Considerations

- Always use HTTPS in production
- Implement authentication/authorization
- Rate limit WebSocket connections
- Validate and sanitize all incoming messages
- Keep dependencies updated
- Use environment variables for sensitive data

## 📚 Additional Resources

- [WebSocket Protocol](https://tools.ietf.org/html/rfc6455)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx as WebSocket Proxy](https://www.nginx.com/blog/websocket-nginx/)
- [WebSocket Best Practices](https://blog.stanko.io/websocket-best-practices-b0d4f5226aa0)

### 5. Start the Server

#### Development Mode

```bash
cd packages/protocol-connectors/websocket
pnpm dev
```

#### Production Mode with PM2 (Recommended)

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. Start the server with PM2:
   ```bash
   pm2 start --name websocket-server "node dist/server.js"
   ```

3. Save the PM2 process list and configure it to start on system boot:
   ```bash
   pm2 save
   pm2 startup
   ```

### 6. Set Up Nginx as a Reverse Proxy (Recommended for Production)

Create a new Nginx configuration file at `/etc/nginx/sites-available/websocket`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /ws/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Additional configurations for static files, SSL, etc.
}
```

Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/websocket /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

### 7. Set Up SSL with Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain and install certificate
sudo certbot --nginx -d your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

### 8. Monitor the Application

#### PM2 Monitoring

```bash
# View logs
pm2 logs websocket-server

# Monitor resources
pm2 monit

# Show application information
pm2 show websocket-server
```

## 🛠️ Environment Configuration

### Required Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Application environment | `development` |
| `PORT` | Port to listen on | `3000` |
| `WS_PATH` | WebSocket endpoint path | `/ws` |
| `MAX_CONNECTIONS` | Maximum concurrent connections | `1000` |

## 🔄 Updating the Application

1. Pull the latest changes:
   ```bash
   git pull origin main
   ```

2. Rebuild the application:
   ```bash
   pnpm build
   ```

3. Restart the PM2 process:
   ```bash
   pm2 restart websocket-server
   ```

## 🚨 Troubleshooting

### Common Issues

1. **Port already in use**
   - Check for other processes using the port: `lsof -i :3000`
   - Kill the process: `kill -9 <PID>`

2. **Permission denied**
   - Make sure the user running the application has the necessary permissions
   - Try running with `sudo` if necessary

3. **WebSocket connection issues**
   - Verify the WebSocket URL is correct
   - Check Nginx configuration for WebSocket support
   - Ensure the server is running and accessible

## 📞 Support

For any issues, please open an issue on [GitHub](https://github.com/Gzeu/salahor/issues).

---

**Note**: This guide assumes a Linux/Unix environment. Adjust the commands as necessary for other operating systems.
