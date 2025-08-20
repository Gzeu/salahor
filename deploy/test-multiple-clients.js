import WebSocket from 'ws';
import { performance } from 'perf_hooks';

const NUM_CLIENTS = 5;
const MESSAGES_PER_CLIENT = 3;
const DELAY_BETWEEN_MESSAGES = 500; // ms

const stats = {
  connected: 0,
  messagesSent: 0,
  messagesReceived: 0,
  errors: 0,
  startTime: performance.now()
};

console.log(`Testing with ${NUM_CLIENTS} clients, ${MESSAGES_PER_CLIENT} messages each...`);

for (let i = 1; i <= NUM_CLIENTS; i++) {
  const ws = new WebSocket('ws://localhost:4002');
  let messagesSent = 0;

  ws.on('open', () => {
    stats.connected++;
    console.log(`Client ${i} connected`);
    
    // Send initial message
    const sendMessage = () => {
      if (messagesSent < MESSAGES_PER_CLIENT) {
        const message = `Client ${i}, Message ${messagesSent + 1}`;
        ws.send(message);
        stats.messagesSent++;
        messagesSent++;
        
        if (messagesSent < MESSAGES_PER_CLIENT) {
          setTimeout(sendMessage, DELAY_BETWEEN_MESSAGES);
        }
      }
    };
    
    sendMessage();
  });

  ws.on('message', (data) => {
    stats.messagesReceived++;
    console.log(`[${i}] Received: ${data}`);
    
    // Close connection after receiving all expected messages
    if (messagesSent === MESSAGES_PER_CLIENT && stats.messagesReceived === NUM_CLIENTS * MESSAGES_PER_CLIENT) {
      console.log('\n--- Test Complete ---');
      console.log(`Clients connected: ${stats.connected}/${NUM_CLIENTS}`);
      console.log(`Messages sent: ${stats.messagesSent}`);
      console.log(`Messages received: ${stats.messagesReceived}`);
      console.log(`Errors: ${stats.errors}`);
      console.log(`Test duration: ${((performance.now() - stats.startTime) / 1000).toFixed(2)}s`);
      process.exit(0);
    }
  });

  ws.on('error', (error) => {
    stats.errors++;
    console.error(`[${i}] Error:`, error.message);
  });

  ws.on('close', () => {
    console.log(`[${i}] Connection closed`);
  });
}
