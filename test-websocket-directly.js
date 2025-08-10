import { createWebSocketServer, createWebSocketClient } from './src/connectors/websocket.js';

async function testWebSocket() {
  console.log('Starting WebSocket server...');
  const server = await createWebSocketServer();
  const port = server.address().port;
  
  console.log(`WebSocket server started on port ${port}`);
  
  try {
    console.log('Creating WebSocket client...');
    const client = createWebSocketClient(`ws://localhost:${port}`, {
      reconnectDelay: 100,
      maxReconnectAttempts: 3
    });
    
    console.log('Client created. Available methods:', Object.keys(client).join(', '));
    
    // Test basic methods
    console.log('Testing client methods:');
    console.log('- client.send is a function:', typeof client.send === 'function');
    console.log('- client.subscribe is a function:', typeof client.subscribe === 'function');
    
    // Subscribe to messages
    const receivedMessages = [];
    const messageHandler = (data) => {
      console.log('Received message:', data);
      receivedMessages.push(data);
    };
    
    client.subscribe(messageHandler);
    console.log('Subscribed to messages');
    
    // Send a test message
    const testMessage = { id: 1, text: 'Hello, WebSocket!' };
    console.log('Sending message:', testMessage);
    await client.send(JSON.stringify(testMessage));
    
    // Wait a bit for the message to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if message was received
    console.log('Received messages count:', receivedMessages.length);
    if (receivedMessages.length > 0) {
      console.log('First message:', receivedMessages[0]);
    }
    
    // Cleanup
    client.unsubscribe(messageHandler);
    await client.close();
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    // Close the server
    await new Promise(resolve => server.close(resolve));
    console.log('WebSocket server closed');
  }
}

testWebSocket().catch(console.error);
