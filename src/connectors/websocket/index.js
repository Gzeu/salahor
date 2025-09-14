import { compressMessage, decompressMessage } from './compression';
import { protocols } from './protocols';
import { BatchOperationError } from '../../operators/errors';

/**
 * WebSocket connector configuration
 * @typedef {Object} WebSocketConfig
 * @property {string|string[]} [protocols] - WebSocket subprotocols to use
 * @property {boolean} [compress=false] - Enable message compression
 * @property {number} [reconnectDelay=1000] - Delay between reconnection attempts (ms)
 * @property {number} [maxReconnectAttempts=5] - Maximum number of reconnection attempts
 * @property {number} [heartbeatInterval=30000] - Heartbeat interval (ms)
 * @property {AbortSignal} [signal] - Signal to abort operations
 */

/**
 * Creates a WebSocket connector with compression and protocol support
 * @param {string} url - The WebSocket URL to connect to
 * @param {WebSocketConfig} [config] - Connector configuration
 */
export class WebSocketConnector {
  constructor(url, config = {}) {
    this.url = url;
    this.config = {
      compress: false,
      reconnectDelay: 1000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      ...config
    };
    
    this.ws = null;
    this.reconnectAttempts = 0;
    this.heartbeatTimer = null;
    this.protocolHandler = null;
    
    // Initialize protocol handler
    if (config.protocols) {
      const protocol = Array.isArray(config.protocols) 
        ? config.protocols[0] 
        : config.protocols;
      const ProtocolClass = protocols[protocol];
      if (ProtocolClass) {
        this.protocolHandler = new ProtocolClass();
      }
    }
  }
  
  /**
   * Connect to the WebSocket server
   */
  async connect() {
    try {
      this.ws = new WebSocket(
        this.url, 
        this.config.protocols || []
      );
      
      // Set up event handlers
      this.ws.onopen = this._handleOpen.bind(this);
      this.ws.onclose = this._handleClose.bind(this);
      this.ws.onerror = this._handleError.bind(this);
      this.ws.onmessage = this._handleMessage.bind(this);
      
      // Set up heartbeat
      if (this.config.heartbeatInterval > 0) {
        this._startHeartbeat();
      }
      
      // Set up abort handler
      if (this.config.signal) {
        this.config.signal.addEventListener('abort', () => {
          this.close();
        });
      }
      
      // Wait for connection
      await new Promise((resolve, reject) => {
        const onOpen = () => {
          this.ws.removeEventListener('open', onOpen);
          this.ws.removeEventListener('error', onError);
          resolve();
        };
        
        const onError = (error) => {
          this.ws.removeEventListener('open', onOpen);
          this.ws.removeEventListener('error', onError);
          reject(error);
        };
        
        this.ws.addEventListener('open', onOpen);
        this.ws.addEventListener('error', onError);
      });
    } catch (error) {
      await this._handleReconnect(error);
    }
  }
  
  /**
   * Close the WebSocket connection
   */
  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  
  /**
   * Send a message through the WebSocket
   * @param {any} message - The message to send
   */
  async send(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }
    
    try {
      // Encode message if protocol handler exists
      let data = this.protocolHandler
        ? this.protocolHandler.encode(message)
        : message;
      
      // Compress if enabled
      if (this.config.compress) {
        data = await compressMessage(data);
      }
      
      this.ws.send(data);
    } catch (error) {
      throw new BatchOperationError('Failed to send message', message);
    }
  }
  
  /**
   * Create an AsyncIterable for receiving messages
   */
  async *receive() {
    while (this.ws) {
      try {
        const message = await new Promise((resolve, reject) => {
          const onMessage = async (event) => {
            try {
              let data = event.data;
              
              // Decompress if needed
              if (this.config.compress) {
                data = await decompressMessage(data);
              }
              
              // Decode if protocol handler exists
              if (this.protocolHandler) {
                data = this.protocolHandler.decode(data);
              }
              
              this.ws.removeEventListener('message', onMessage);
              this.ws.removeEventListener('error', onError);
              resolve(data);
            } catch (error) {
              reject(error);
            }
          };
          
          const onError = (error) => {
            this.ws.removeEventListener('message', onMessage);
            this.ws.removeEventListener('error', onError);
            reject(error);
          };
          
          this.ws.addEventListener('message', onMessage);
          this.ws.addEventListener('error', onError);
        });
        
        yield message;
      } catch (error) {
        if (this.ws) {
          await this._handleReconnect(error);
        } else {
          break;
        }
      }
    }
  }
  
  // Private methods
  
  _handleOpen() {
    this.reconnectAttempts = 0;
  }
  
  async _handleClose(event) {
    if (!event.wasClean) {
      await this._handleReconnect(
        new Error('WebSocket connection closed unexpectedly')
      );
    }
  }
  
  async _handleError(error) {
    await this._handleReconnect(error);
  }
  
  async _handleMessage(event) {
    // Handle incoming messages
  }
  
  async _handleReconnect(error) {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      throw new Error(
        `WebSocket reconnection failed after ${this.reconnectAttempts} attempts: ${error.message}`
      );
    }
    
    this.reconnectAttempts++;
    
    await new Promise(resolve => 
      setTimeout(resolve, this.config.reconnectDelay)
    );
    
    await this.connect();
  }
  
  _startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, this.config.heartbeatInterval);
  }
}
