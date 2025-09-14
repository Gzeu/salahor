/**
 * WebSocket subprotocol handler interface and implementations
 */

/**
 * Base WebSocket subprotocol handler
 */
export class SubprotocolHandler {
  /**
   * Protocol identifier
   * @returns {string} The WebSocket subprotocol name
   */
  static get protocol() {
    throw new Error('Subprotocol must be implemented');
  }
  
  /**
   * Encode message for sending
   * @param {any} message - Message to encode
   * @returns {string|Uint8Array} Encoded message
   */
  encode(message) {
    throw new Error('encode() must be implemented');
  }
  
  /**
   * Decode received message
   * @param {string|Uint8Array} data - Received data
   * @returns {any} Decoded message
   */
  decode(data) {
    throw new Error('decode() must be implemented');
  }
}

/**
 * JSON protocol handler
 */
export class JsonProtocol extends SubprotocolHandler {
  static get protocol() {
    return 'json';
  }
  
  encode(message) {
    return JSON.stringify(message);
  }
  
  decode(data) {
    return JSON.parse(typeof data === 'string' ? data : new TextDecoder().decode(data));
  }
}

/**
 * MessagePack protocol handler
 */
export class MsgPackProtocol extends SubprotocolHandler {
  static get protocol() {
    return 'msgpack';
  }
  
  encode(message) {
    // Simple MessagePack-like encoding without dependencies
    const encoder = new TextEncoder();
    
    if (typeof message === 'string') {
      const strBytes = encoder.encode(message);
      const header = new Uint8Array([0xA0 | strBytes.length]); // str8
      return this._concat(header, strBytes);
    }
    
    if (typeof message === 'number') {
      if (Number.isInteger(message) && message >= 0 && message <= 127) {
        return new Uint8Array([message]); // positive fixint
      }
      // Convert to string for other numbers
      return this.encode(message.toString());
    }
    
    if (Array.isArray(message)) {
      const header = new Uint8Array([0x90 | Math.min(message.length, 15)]); // fixarray
      const parts = message.map(item => this.encode(item));
      return this._concat(header, ...parts);
    }
    
    if (message && typeof message === 'object') {
      const entries = Object.entries(message);
      const header = new Uint8Array([0x80 | Math.min(entries.length, 15)]); // fixmap
      const parts = entries.flatMap(([key, value]) => [
        this.encode(key),
        this.encode(value)
      ]);
      return this._concat(header, ...parts);
    }
    
    if (message === null || message === undefined) {
      return new Uint8Array([0xC0]); // nil
    }
    
    if (typeof message === 'boolean') {
      return new Uint8Array([message ? 0xC3 : 0xC2]); // true/false
    }
    
    throw new Error('Unsupported message type');
  }
  
  decode(data) {
    // Simple MessagePack-like decoding without dependencies
    const view = new DataView(
      data instanceof ArrayBuffer ? data : data.buffer
    );
    let offset = 0;
    
    const readNext = () => {
      const byte = view.getUint8(offset++);
      
      // nil
      if (byte === 0xC0) return null;
      
      // boolean
      if (byte === 0xC2) return false;
      if (byte === 0xC3) return true;
      
      // positive fixint
      if ((byte & 0x80) === 0) return byte;
      
      // fixstr
      if ((byte & 0xE0) === 0xA0) {
        const len = byte & 0x1F;
        const strBytes = new Uint8Array(view.buffer, offset, len);
        offset += len;
        return new TextDecoder().decode(strBytes);
      }
      
      // fixarray
      if ((byte & 0xF0) === 0x90) {
        const len = byte & 0x0F;
        const arr = [];
        for (let i = 0; i < len; i++) {
          arr.push(readNext());
        }
        return arr;
      }
      
      // fixmap
      if ((byte & 0xF0) === 0x80) {
        const len = byte & 0x0F;
        const obj = {};
        for (let i = 0; i < len; i++) {
          const key = readNext();
          obj[key] = readNext();
        }
        return obj;
      }
      
      throw new Error('Unsupported message type');
    };
    
    return readNext();
  }
  
  _concat(...arrays) {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  }
}

/**
 * CBOR protocol handler
 */
export class CborProtocol extends SubprotocolHandler {
  static get protocol() {
    return 'cbor';
  }
  
  encode(message) {
    // Simple CBOR encoding without dependencies
    const encoder = new TextEncoder();
    
    if (typeof message === 'string') {
      const strBytes = encoder.encode(message);
      const header = new Uint8Array([0x60 | Math.min(strBytes.length, 23)]); // text string
      return this._concat(header, strBytes);
    }
    
    if (typeof message === 'number') {
      if (Number.isInteger(message)) {
        if (message >= 0 && message <= 23) {
          return new Uint8Array([message]); // unsigned integer 0-23
        }
      }
      // Convert to string for other numbers
      return this.encode(message.toString());
    }
    
    if (Array.isArray(message)) {
      const header = new Uint8Array([0x80 | Math.min(message.length, 23)]); // array
      const parts = message.map(item => this.encode(item));
      return this._concat(header, ...parts);
    }
    
    if (message && typeof message === 'object') {
      const entries = Object.entries(message);
      const header = new Uint8Array([0xA0 | Math.min(entries.length, 23)]); // map
      const parts = entries.flatMap(([key, value]) => [
        this.encode(key),
        this.encode(value)
      ]);
      return this._concat(header, ...parts);
    }
    
    if (message === null || message === undefined) {
      return new Uint8Array([0xF6]); // null
    }
    
    if (typeof message === 'boolean') {
      return new Uint8Array([message ? 0xF5 : 0xF4]); // true/false
    }
    
    throw new Error('Unsupported message type');
  }
  
  decode(data) {
    // Simple CBOR decoding without dependencies
    const view = new DataView(
      data instanceof ArrayBuffer ? data : data.buffer
    );
    let offset = 0;
    
    const readNext = () => {
      const byte = view.getUint8(offset++);
      
      // Major type 0: unsigned integer
      if ((byte & 0xE0) === 0) {
        return byte & 0x1F;
      }
      
      // Major type 3: text string
      if ((byte & 0xE0) === 0x60) {
        const len = byte & 0x1F;
        const strBytes = new Uint8Array(view.buffer, offset, len);
        offset += len;
        return new TextDecoder().decode(strBytes);
      }
      
      // Major type 4: array
      if ((byte & 0xE0) === 0x80) {
        const len = byte & 0x1F;
        const arr = [];
        for (let i = 0; i < len; i++) {
          arr.push(readNext());
        }
        return arr;
      }
      
      // Major type 5: map
      if ((byte & 0xE0) === 0xA0) {
        const len = byte & 0x1F;
        const obj = {};
        for (let i = 0; i < len; i++) {
          const key = readNext();
          obj[key] = readNext();
        }
        return obj;
      }
      
      // Major type 7: simple/floating-point
      if ((byte & 0xE0) === 0xE0) {
        if (byte === 0xF4) return false;
        if (byte === 0xF5) return true;
        if (byte === 0xF6) return null;
      }
      
      throw new Error('Unsupported message type');
    };
    
    return readNext();
  }
  
  _concat(...arrays) {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  }
}

// Register available protocols
export const protocols = {
  [JsonProtocol.protocol]: JsonProtocol,
  [MsgPackProtocol.protocol]: MsgPackProtocol,
  [CborProtocol.protocol]: CborProtocol
};
