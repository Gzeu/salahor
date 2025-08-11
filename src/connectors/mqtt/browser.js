/**
 * Connect to an MQTT broker (Browser implementation using Paho MQTT)
 * @param {string} url - MQTT broker URL (WebSocket URL)
 * @param {Object} [options] - MQTT client options
 * @returns {Promise<Object>} Connected MQTT client
 */
export function connect(url, options = {}) {
  return new Promise((resolve, reject) => {
    // Parse the URL to get host and port
    const urlObj = new URL(url);
    const host = urlObj.hostname;
    const port = parseInt(urlObj.port) || (urlObj.protocol === 'wss:' ? 443 : 80);
    const clientId = options.clientId || `mqtt_${Math.random().toString(16).substr(2, 8)}`;
    
    // Create a Paho MQTT client
    const client = new Paho.MQTT.Client(host, port, '', clientId);
    
    // Connection options
    const connectOptions = {
      onSuccess: () => {
        const wrappedClient = {
          on: (event, callback) => {
            if (event === 'error') {
              client.onConnectionLost = (error) => {
                if (error.errorCode !== 0) {
                  callback(error);
                }
              };
            } else if (event === 'close') {
              client.onConnectionLost = (error) => {
                if (error.errorCode === 0) {
                  callback();
                }
              };
            } else if (event === 'message') {
              client.onMessageArrived = (message) => {
                callback({
                  topic: message.destinationName,
                  message: message.payloadString,
                  packet: message
                });
              };
            }
          },
          
          subscribe: (topic, options = {}) => {
            return new Promise((resolveSub, rejectSub) => {
              try {
                client.subscribe(topic, {
                  qos: options.qos || 0,
                  onSuccess: () => resolveSub([{ topic, qos: options.qos || 0 }]),
                  onFailure: rejectSub
                });
              } catch (error) {
                rejectSub(error);
              }
            });
          },
          
          unsubscribe: (topic) => {
            return new Promise((resolveUnsub, rejectUnsub) => {
              try {
                client.unsubscribe(topic, {
                  onSuccess: resolveUnsub,
                  onFailure: rejectUnsub
                });
              } catch (error) {
                rejectUnsub(error);
              }
            });
          },
          
          publish: (topic, message, options = {}, callback) => {
            const msg = new Paho.MQTT.Message(message);
            msg.destinationName = topic;
            msg.qos = options.qos || 0;
            msg.retained = options.retain || false;
            
            try {
              client.send(msg);
              if (callback) {
                callback();
              }
            } catch (error) {
              if (callback) {
                callback(error);
              }
              throw error;
            }
          },
          
          end: (force, opts, callback) => {
            try {
              client.disconnect();
              if (callback) {
                callback();
              }
            } catch (error) {
              if (callback) {
                callback(error);
              }
              throw error;
            }
          },
          
          removeAllListeners: () => {
            client.onConnectionLost = null;
            client.onMessageArrived = null;
          }
        };
        
        resolve(wrappedClient);
      },
      
      onFailure: (error) => {
        reject(new Error(`Connection failed: ${error.errorMessage}`));
      },
      
      reconnect: options.reconnect !== false,
      keepAliveInterval: options.keepalive || 60,
      cleanSession: options.clean !== false,
      useSSL: urlObj.protocol === 'wss:',
      ...options
    };
    
    // Set username and password if provided
    if (options.username) {
      connectOptions.userName = options.username;
    }
    
    if (options.password) {
      connectOptions.password = options.password;
    }
    
    // Connect to the broker
    client.connect(connectOptions);
  });
}

export default { connect };
