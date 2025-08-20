module.exports = {
  apps: [{
    name: 'websocket-server',
    script: 'clean-server.js',
    instances: 'max',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 4002
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 4002
    }
  }]
};
