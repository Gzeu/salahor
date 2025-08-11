import { createMqttClient } from './src/connectors/mqtt.js';

// Test configuration
const MQTT_BROKER_URL = 'ws://test.mosquitto.org:8080';
const TEST_TOPIC = 'salahor/test/topic';

async function runMqttTest() {
  let client;
  
  try {
    console.log('Creating MQTT client...');
    client = await createMqttClient({
      url: MQTT_BROKER_URL,
      mqttOptions: {
        clientId: `test-client-${Math.random().toString(16).substr(2, 8)}`,
        reconnectPeriod: 1000,
        connectTimeout: 10000,
        keepalive: 60
      }
    });

    console.log('MQTT client created and connected');
    
    const testMessage = { value: 'test-message', timestamp: Date.now() };
    const messageString = JSON.stringify(testMessage);
    
    console.log('Subscribing to topic:', TEST_TOPIC);
    const subscription = await client.subscribe(TEST_TOPIC);
    console.log('Successfully subscribed to topic');
    
    // Set up message collection with timeout
    const messagePromise = new Promise((resolve, reject) => {
      console.log('Setting up message handler...');
      const timeout = setTimeout(() => {
        console.log('Message receive timeout reached');
        reject(new Error('No message received before timeout'));
      }, 10000);
      
      const onMessage = (msg) => {
        console.log('Message received:', JSON.stringify(msg, null, 2));
        if (msg.topic === TEST_TOPIC) {
          console.log('Matching topic found');
          clearTimeout(timeout);
          resolve(msg);
          client.off('message', onMessage);
        }
      };
      
      console.log('Adding message event listener');
      client.on('message', onMessage);
    });
    
    console.log('Publishing test message:', messageString);
    await client.publish(TEST_TOPIC, messageString);
    console.log('Message published, waiting for receipt...');
    
    // Wait for the message
    const received = await messagePromise;
    console.log('Message promise resolved, received:', JSON.stringify(received, null, 2));
    
    // Verify the message
    if (!received) {
      throw new Error('No message was received');
    }
    
    if (received.topic !== TEST_TOPIC) {
      throw new Error(`Unexpected topic: ${received.topic}`);
    }
    
    const receivedMessage = typeof received.message === 'string' 
      ? received.message 
      : received.message.toString('utf8');
      
    if (receivedMessage !== messageString) {
      throw new Error(`Message content mismatch. Expected: ${messageString}, Got: ${receivedMessage}`);
    }
    
    console.log('Test passed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      console.log('Closing MQTT client...');
      await client.close();
      console.log('MQTT client closed');
    }
    process.exit(0);
  }
}

runMqttTest().catch(console.error);
