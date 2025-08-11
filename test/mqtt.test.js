import { test, expect, beforeAll, afterAll } from '@playwright/test';
import { createMqttClient } from '../src/connectors/mqtt.js';

// Test configuration
const MQTT_BROKER_URL = 'ws://test.mosquitto.org:8080';
const TEST_TOPIC = 'salahor/test/topic';

// Skip tests in browser environment for now since we need to set up Paho MQTT
const testIfNode = process.env.TEST_ENV !== 'browser' ? test : test.skip;

test.describe('MQTT Connector', () => {
  let client;
  let receivedMessages = [];

  testIfNode('should connect to MQTT broker', async () => {
    client = await createMqttClient({
      url: MQTT_BROKER_URL,
      mqttOptions: {
        clientId: `test-client-${Math.random().toString(16).substr(2, 8)}`
      }
    });

    expect(client).toBeDefined();
    expect(typeof client.subscribe).toBe('function');
    expect(typeof client.publish).toBe('function');
  });

  testIfNode('should subscribe to a topic and receive messages', async () => {
    const testMessage = { value: 'test-message', timestamp: Date.now() };
    const messageString = JSON.stringify(testMessage);
    
    // Subscribe to the test topic
    const subscription = await client.subscribe(TEST_TOPIC);
    
    // Set up message collection
    const messagePromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null);
      }, 5000);
      
      const onMessage = (msg) => {
        if (msg.topic === TEST_TOPIC) {
          clearTimeout(timeout);
          resolve(msg);
          client.off('message', onMessage);
        }
      };
      
      client.on('message', onMessage);
    });
    
    // Publish a test message
    await client.publish(TEST_TOPIC, messageString);
    
    // Wait for the message
    const received = await messagePromise;
    
    expect(received).not.toBeNull();
    expect(received.topic).toBe(TEST_TOPIC);
    expect(received.message).toBe(messageString);
  });

  testIfNode('should handle async iteration', async () => {
    const testMessages = [
      { value: 'message-1', timestamp: Date.now() },
      { value: 'message-2', timestamp: Date.now() },
      { value: 'message-3', timestamp: Date.now() }
    ];
    
    // Subscribe to the test topic
    const subscription = client.subscribe(TEST_TOPIC);
    
    // Publish test messages
    for (const msg of testMessages) {
      await client.publish(TEST_TOPIC, JSON.stringify(msg));
    }
    
    // Collect messages using async iteration
    const received = [];
    const controller = new AbortController();
    const { signal } = controller;
    
    // Set a timeout to avoid hanging if something goes wrong
    const timeout = setTimeout(() => {
      controller.abort();
    }, 5000);
    
    try {
      for await (const msg of subscription) {
        received.push(JSON.parse(msg.message));
        if (received.length >= testMessages.length) {
          clearTimeout(timeout);
          break;
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        throw error;
      }
    }
    
    expect(received.length).toBe(testMessages.length);
    expect(received.map(m => m.value)).toEqual(
      expect.arrayContaining(testMessages.map(m => m.value))
    );
  });

  testIfNode.afterAll(async () => {
    if (client) {
      await client.close();
    }
  });
});
