import { test, expect } from '@playwright/test';
import { createMqttClient } from '../src/connectors/mqtt.js';

// Test configuration
const MQTT_BROKER_URL = 'ws://test.mosquitto.org:8080';
const TEST_TOPIC = 'salahor/test/topic';

test.describe('MQTT Connector', () => {
  let client;

  test('should connect to MQTT broker', async () => {
    // Skip in browser environment
    test.skip(process.env.TEST_ENV === 'browser', 'Skipping MQTT test in browser environment');
    
    client = await createMqttClient({
      url: MQTT_BROKER_URL,
      mqttOptions: {
        clientId: `test-client-${Math.random().toString(16).substr(2, 8)}`
      }
    });

    expect(client).toBeDefined();
    expect(typeof client.subscribe).toBe('function');
    expect(typeof client.publish).toBe('function');
    
    // Clean up
    await client.close();
  });

  test('should subscribe and publish messages', async ({ page }, testInfo) => {
    // Skip in browser environment
    test.skip(process.env.TEST_ENV === 'browser', 'Skipping MQTT test in browser environment');
    
    // Add test timeout
    testInfo.setTimeout(30000); // 30 second timeout
    
    console.log('Creating MQTT client...');
    try {
      client = await createMqttClient({
        url: MQTT_BROKER_URL,
        mqttOptions: {
          clientId: `test-client-${Math.random().toString(16).substr(2, 8)}`,
          reconnectPeriod: 1000,
          connectTimeout: 10000,
          keepalive: 60
        }
      });
      console.log('MQTT client created successfully');
    } catch (error) {
      console.error('Failed to create MQTT client:', error);
      throw error;
    }
    
    // Verify client is connected
    if (!client.connected) {
      throw new Error('MQTT client is not connected after creation');
    }
    console.log('MQTT client connected, subscribing to topic...');

    const testMessage = { value: 'test-message', timestamp: Date.now() };
    const messageString = JSON.stringify(testMessage);
    
    // Subscribe to the test topic
    console.log('Subscribing to topic:', TEST_TOPIC);
    const subscription = await client.subscribe(TEST_TOPIC);
    console.log('Successfully subscribed to topic');
    
    // Set up message collection
    let messageReceived = false;
    const messagePromise = new Promise((resolve) => {
      console.log('Setting up message handler...');
      const timeout = setTimeout(() => {
        console.log('Message receive timeout reached');
        resolve(null);
      }, 10000); // Increased timeout to 10 seconds
      
      const onMessage = (msg) => {
        console.log('Message received:', msg);
        if (msg.topic === TEST_TOPIC) {
          console.log('Matching topic found, resolving promise');
          clearTimeout(timeout);
          resolve(msg);
          client.off('message', onMessage);
          messageReceived = true;
        }
      };
      
      console.log('Adding message event listener');
      client.on('message', onMessage);
    });
    
    // Publish a test message
    console.log('Publishing test message:', messageString);
    await client.publish(TEST_TOPIC, messageString);
    console.log('Message published, waiting for receipt...');
    
    // Wait for the message
    const received = await messagePromise;
    console.log('Message promise resolved, received:', received);
    
    if (!messageReceived) {
      console.error('No message was received before timeout');
      throw new Error('No message received before timeout');
    }
    
    expect(received).not.toBeNull();
    expect(received.topic).toBe(TEST_TOPIC);
    
    // Handle both Buffer and string message formats
    const messageContent = Buffer.isBuffer(received.message) 
      ? received.message.toString('utf8')
      : received.message;
      
    expect(messageContent).toBe(messageString);
    
    // Clean up
    await client.close();
  });
});
