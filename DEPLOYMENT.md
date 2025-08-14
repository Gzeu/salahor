# Deployment Guide for WebSocket Server

## 📋 Pre-requisites

- Node.js 18 or higher
- pnpm 7 or higher
- Git
- PM2 (recommended for production) or another process manager
- Nginx (recommended for production)

## 🚀 Deployment Steps

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
```

### 3. Build the Project

```bash
# Build all packages
pnpm build

# Or build only the WebSocket server
cd packages/protocol-connectors/websocket
pnpm build
```

### 4. Configure Environment Variables

Create a `.env` file in the project root with the following variables:

```env
NODE_ENV=production
PORT=3000
WS_PATH=/ws
# Add any other environment-specific variables here
```

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
