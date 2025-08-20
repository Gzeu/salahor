export default {
  apps: [{
    name: 'websocket-server',
    script: './clean-server.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 4000,
      HOST: 'localhost'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 4000,
      HOST: 'localhost',
      RATE_LIMIT_MAX: 200,
      RATE_LIMIT_WINDOW_MS: 60000
    }
  }]
};
