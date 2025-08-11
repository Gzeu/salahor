import mqtt from 'mqtt';

/**
 * Connect to an MQTT broker (Node.js implementation)
 * @param {string} url - MQTT broker URL
 * @param {Object} [options] - MQTT client options
 * @returns {Promise<Object>} Connected MQTT client
 */
export function connect(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(url, {
      reconnectPeriod: 1000,
      ...options
    });

    client.once('connect', () => {
      // Remove the error listener since we're connected
      client.removeAllListeners('error');
      
      // Wrap the client methods to match our interface
      const wrappedClient = {
        on: client.on.bind(client),
        subscribe: (topic, options) => {
          return new Promise((resolveSub, rejectSub) => {
            client.subscribe(topic, options, (err, granted) => {
              if (err) {
                rejectSub(err);
              } else {
                resolveSub(granted);
              }
            });
          });
        },
        unsubscribe: (topic) => {
          return new Promise((resolveUnsub) => {
            client.unsubscribe(topic, () => {
              resolveUnsub();
            });
          });
        },
        publish: (topic, message, options, callback) => {
          return client.publish(topic, message, options, callback);
        },
        end: (force, opts, callback) => {
          client.end(force, opts, callback);
        },
        onMessage: (callback) => {
          client.on('message', (topic, message, packet) => {
            // Convert message to string if it's a Buffer
            const messageStr = Buffer.isBuffer(message) 
              ? message.toString('utf8')
              : message;
              
            callback({
              topic,
              message: message.toString(),
              packet
            });
          });
        },
        removeAllListeners: client.removeAllListeners.bind(client)
      };

      // Set up message handler
      wrappedClient.onMessage = (callback) => {
        client.on('message', (topic, message, packet) => {
          callback({
            topic,
            message: message.toString(),
            packet
          });
        });
      };

      resolve(wrappedClient);
    });

    client.once('error', (error) => {
      client.end();
      reject(error);
    });
  });
}

export default { connect };
