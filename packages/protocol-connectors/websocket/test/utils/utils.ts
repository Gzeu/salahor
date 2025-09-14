import { WebSocket as WS } from 'ws';
import type { RawData } from 'ws';
import { EventEmitter } from 'events';

// Test-specific WebSocket implementation for testing
interface TestWebSocketInterface {
  isOpen: boolean;
  isClosed: boolean;
  messages: any[];
  readyState: number;
  simulateMessage(data: any): void;
  simulateOpen(): void;
  simulateClose(code?: number, reason?: string): void;
  addEventListener(event: string, listener: (...args: any[]) => void): void;
  removeEventListener(event: string, listener: (...args: any[]) => void): void;
}

export class TestWebSocket extends EventEmitter implements TestWebSocketInterface {
  public static instances: TestWebSocket[] = [];
  public messages: any[] = [];
  public isOpen = false;
  public isClosed = false;
  public readyState: WS['CONNECTING'] | WS['OPEN'] | WS['CLOSING'] | WS['CLOSED'] = WS.CONNECTING;
  public readonly CONNECTING = WS.CONNECTING;
  public readonly OPEN = WS.OPEN;
  public readonly CLOSING = WS.CLOSING;
  public readonly CLOSED = WS.CLOSED;

  public url: string;
  public protocol = '';
  public binaryType: 'nodebuffer' | 'arraybuffer' | 'fragments' = 'nodebuffer';
  public bufferedAmount = 0;
  public extensions = '';
  public isPaused = false;
  public onclose: ((this: WS, ev: any) => any) | null = null;
  public onerror: ((this: WS, ev: any) => any) | null = null;
  public onmessage: ((this: WS, ev: any) => any) | null = null;
  public onopen: ((this: WS, ev: any) => any) | null = null;

  constructor(url: string, protocols?: string | string[]) {
    super();
    this.url = url;
    if (protocols) {
      this.protocol = Array.isArray(protocols) ? protocols[0] : protocols;
    }
    TestWebSocket.instances.push(this);
    
    // Simulate connection after a small delay
    setTimeout(() => this.simulateOpen(), 10);
  }

  simulateOpen(): void {
    this.readyState = WebSocket.OPEN;
    this.isOpen = true;
    this.emit('open');
  }

  send(data: RawData, cb?: (err?: Error) => void): void;
  send(
    data: RawData,
    options: { mask?: boolean; binary?: boolean; compress?: boolean; fin?: boolean },
    cb?: (err?: Error) => void
  ): void;
  send(data: any, options?: any, cb?: any): void {
    this.messages.push(data);
    if (typeof options === 'function') {
      options();
    } else if (cb) {
      cb();
    }
  }

  close(code?: number, data?: string | Buffer): void {
    this.readyState = WebSocket.CLOSED;
    this.isOpen = false;
    this.isClosed = true;
    this.emit('close', code || 1000, data?.toString() || '');
  }

  simulateMessage(data: any): void {
    this.emit('message', { data });
  }

  simulateClose(code?: number, reason?: string): void {
    this.close(code, reason);
  }

  // Implement EventEmitter-like interface
  addEventListener(event: string | symbol, listener: (...args: any[]) => void): this {
    this.on(event, listener);
    return this;
  }

  removeEventListener(event: string | symbol, listener: (...args: any[]) => void): this {
    this.off(event, listener);
    return this;
  }

  static reset(): void {
    TestWebSocket.instances = [];
  }
}

export function waitForEvent(ws: TestWebSocket, event: string): Promise<any> {
  return new Promise(resolve => {
    const listener = (...args: any[]) => {
      ws.removeEventListener(event, listener);
      resolve(args[0]);
    };
    ws.addEventListener(event, listener);
  });
}

export function waitForMessage(ws: TestWebSocket): Promise<any> {
  return new Promise(resolve => {
    const listener = (data: any) => {
      ws.removeEventListener('message', listener);
      resolve(data);
    };
    ws.addEventListener('message', listener);
  });
}

export function waitForClose(ws: TestWebSocket): Promise<{ code: number; reason: string }> {
  return new Promise(resolve => {
    const listener = (code: number, reason: string) => {
      ws.removeEventListener('close', listener);
      resolve({ code, reason });
    };
    ws.addEventListener('close', listener);
  });
}
