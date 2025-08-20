const WebSocket = require('ws');

// Helper function to create a test WebSocket client
const createTestClient = (url, protocols, options) => {
  return new Promise((resolve, reject) => {
    const client = new WebSocket(url, protocols, options);
    
    client.on('open', () => resolve(client));
    client.on('error', (error) => reject(error));
  });
};

// Helper function to wait for a message
const waitForMessage = (ws) => {
  return new Promise((resolve) => {
    const onMessage = (data) => {
      ws.off('message', onMessage);
      resolve(data);
    };
    ws.on('message', onMessage);
  });
};

module.exports = {
  createTestClient,
  waitForMessage,
  WebSocket
};
