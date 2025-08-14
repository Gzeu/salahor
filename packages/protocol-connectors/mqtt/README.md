# @salahor/mqtt

MQTT connector for the Salahor ecosystem. Provides a unified interface for working with MQTT brokers using the EventStream pattern from `@salahor/core`.

## Features

- 🌐 **Universal MQTT Client**: Works in both Node.js and browser environments
- 🔄 **Bi-directional Communication**: Full support for MQTT 3.1.1 and 5.0 protocols
- 🛡️ **Type Safety**: Built with TypeScript for enhanced developer experience
- ⚡ **Efficient**: Lightweight and optimized for IoT and real-time applications
- 🔌 **EventStream Integration**: Seamlessly integrates with `@salahor/core` EventStream API

## Installation

```bash
# Using pnpm (recommended)
pnpm add @salahor/mqtt @salahor/core mqtt

# Using npm
npm install @salahor/mqtt @salahor/core mqtt

# Using yarn
yarn add @salahor/mqtt @salahor/core mqtt
```

> **Note**: The `mqtt` package is a peer dependency and must be installed separately.

## Quick Start

### Connecting to an MQTT Broker

```typescript
import { createMqttClient } from '@salahor/mqtt';

const client = createMqttClient({
  url: 'mqtt://test.mosquitto.org:1883',
  options: {
    clientId: 'salahor-client',
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
  },
});

// Subscribe to topics
client.subscribe('sensors/temperature');

// Handle incoming messages
client.messages.subscribe(({ topic, message }) => {
  console.log(`Message received on ${topic}:`, message.toString());
});

// Publish messages
client.publish('sensors/temperature', '25.5');

// Handle connection status
client.status.subscribe(status => {
  console.log('Connection status:', status);
});

// Disconnect when done
// await client.disconnect();
```

## API Reference

### `createMqttClient(config: MqttClientConfig): MqttClient`

Creates a new MQTT client instance.

**Configuration:**
- `url`: MQTT broker URL (e.g., 'mqtt://localhost:1883')
- `options`: MQTT client options (see [MQTT.js documentation](https://github.com/mqttjs/MQTT.js#client))
- `transform`: Optional function to transform incoming/outgoing messages

### MqttClient Methods

- `subscribe(topic: string | string[], options?: IClientSubscribeOptions): void`
  - Subscribe to one or more topics

- `unsubscribe(topic: string | string[], options?: IClientSubscribeOptions): void`
  - Unsubscribe from one or more topics

- `publish(topic: string, message: string | Buffer, options?: IClientPublishOptions): Promise<void>`
  - Publish a message to a topic

- `connect(): Promise<void>`
  - Connect to the MQTT broker

- `disconnect(force?: boolean): Promise<void>`
  - Disconnect from the MQTT broker

## Examples

### Handling Different Message Types

```typescript
// Subscribe with options
client.subscribe('sensors/+/temperature', { qos: 1 });

// Handle JSON messages
client.messages.pipe(
  filter(({ topic }) => topic.startsWith('sensors/')),
  map(({ message }) => JSON.parse(message.toString()))
).subscribe(sensorData => {
  console.log('Sensor data:', sensorData);
});
```

### Error Handling

```typescript
client.status.subscribe({
  next: (status) => {
    if (status === 'error') {
      console.error('Connection error');
    }
  },
  error: (error) => {
    console.error('MQTT client error:', error);
  }
});
```

### Last Will and Testament

```typescript
const client = createMqttClient({
  url: 'mqtt://test.mosquitto.org:1883',
  options: {
    will: {
      topic: 'clients/salahor/status',
      payload: 'offline',
      qos: 1,
      retain: true
    }
  }
});
```

## Best Practices

1. **Connection Management**:
   - Always handle connection status changes
   - Implement proper error handling and reconnection logic
   - Use `disconnect()` when the client is no longer needed

2. **Topic Structure**:
   - Use a consistent naming convention (e.g., `domain/device-id/measurement`)
   - Consider using MQTT 5.0 topic aliases for frequently used topics

3. **Message Handling**:
   - Use appropriate QoS levels based on your reliability requirements
   - Consider message transformation for complex payloads

## License

MIT
