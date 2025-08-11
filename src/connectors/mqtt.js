import { EventEmitter } from 'events';
import { createAsyncQueue } from '../core/asyncQueue.js';

// Use dynamic imports for platform-specific implementations
let mqttImplementation;

if (typeof window !== 'undefined') {
  // Browser environment - using Paho MQTT
  mqttImplementation = await import('./mqtt/browser.js');
} else {
  // Node.js environment - using MQTT.js
  mqttImplementation = await import('./mqtt/node.js');
}

/**
 * Creates a new MQTT client
 * @param {Object} options - Connection options
 * @param {string} options.url - MQTT broker URL (e.g., 'mqtt://test.mosquitto.org' or 'ws://test.mosquitto.org:8080')
 * @param {Object} [options.mqttOptions] - MQTT client options
 * @param {AbortSignal} [options.signal] - Optional AbortSignal to close the connection
 * @returns {Promise<MqttClient>} A promise that resolves to an MQTT client instance
 */
export async function createMqttClient({ url, mqttOptions = {}, signal }) {
  const client = new MqttClient(url, mqttOptions);
  
  if (signal) {
    signal.addEventListener('abort', () => client.close(), { once: true });
  }
  
  await client.connect();
  return client;
}

class MqttClient extends EventEmitter {
  constructor(url, options = {}) {
    super();
    this.url = url;
    this.options = options;
    this.topics = new Map();
    this.client = null;
    this.connected = false;
  }

  async connect() {
    if (this.client) {
      throw new Error('Client already connected');
    }

    try {
      this.client = await mqttImplementation.connect(this.url, this.options);
      this.connected = true;
      
      this.client.on('message', (topic, message) => {
        // Ensure consistent message format
        const messageStr = Buffer.isBuffer(message) 
          ? message.toString('utf8')
          : message;
          
        const messageObj = { topic, message: messageStr };
        
        // Emit the message to any event listeners
        this.emit('message', messageObj);
        
        // Forward to any topic-specific subscribers
        const subscription = this.topics.get(topic);
        if (subscription && subscription.queue) {
          subscription.queue.enqueue(messageObj);
        }
      });
      
      this.client.on('error', (error) => {
        this.emit('error', error);
      });
      
      this.client.on('close', () => {
        this.connected = false;
        this.emit('close');
        // Clean up all topic subscriptions
        for (const [_, subscription] of this.topics) {
          subscription.close();
        }
        this.topics.clear();
      });
      
      return this;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Subscribe to an MQTT topic
   * @param {string} topic - Topic to subscribe to
   * @param {Object} [options] - Subscription options
   * @returns {AsyncIterable<{topic: string, message: any}>} An async iterable of messages
   */
  async subscribe(topic, options = {}) {
    if (!this.connected) {
      throw new Error('Not connected to MQTT broker');
    }

    if (this.topics.has(topic)) {
      return this.topics.get(topic).iterator;
    }

    const queue = createAsyncQueue();
    const subscription = {
      queue,
      // Add a close method to the subscription object
      close: () => {
        this.topics.delete(topic);
        this.client?.unsubscribe(topic);
      }
    };
    
    this.topics.set(topic, subscription);
    
    await this.client.subscribe(topic, options.qos || 0);
    
    // Create an async iterable with cleanup
    const asyncIterator = (async function*() {
      try {
        for await (const message of queue.iterator) {
          yield message;
        }
      } finally {
        // Clean up when the iterator is done
        subscription.close();
      }
    })();
    
    // Store the async iterable on the subscription
    subscription.iterator = asyncIterator;
    
    return asyncIterator;
  }

  /**
   * Publish a message to an MQTT topic
   * @param {string} topic - Topic to publish to
   * @param {string|Buffer} message - Message to publish
   * @param {Object} [options] - Publish options
   * @returns {Promise<void>}
   */
  async publish(topic, message, options = {}) {
    if (!this.connected) {
      throw new Error('Not connected to MQTT broker');
    }
    
    return new Promise((resolve, reject) => {
      this.client.publish(
        topic,
        message,
        { qos: options.qos || 0, retain: options.retain || false },
        (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Close the MQTT connection
   * @returns {Promise<void>}
   */
  async close() {
    if (!this.client) {
      return;
    }
    
    // Close all topic subscriptions
    for (const [topic, subscription] of this.topics) {
      try {
        await this.client.unsubscribe(topic);
        if (subscription.close) {
          subscription.close();
        }
      } catch (error) {
        console.error(`Error unsubscribing from topic ${topic}:`, error);
      }
    }
    
    this.topics.clear();
    
    // Close the MQTT client
    await new Promise((resolve) => {
      this.client.end(false, {}, resolve);
    });
    
    this.client = null;
    this.connected = false;
  }
}

export default createMqttClient;
