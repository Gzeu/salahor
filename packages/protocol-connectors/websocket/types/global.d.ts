// Global type declarations for the WebSocket package

declare const __DEV__: boolean;

declare module 'ws' {
  import { Server as HttpServer } from 'http';
  import { Server as HttpsServer } from 'https';
  import { EventEmitter } from 'events';

  export interface WebSocket extends EventEmitter {
    send(data: string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView): void;
    close(code?: number, reason?: string): void;
    readyState: number;
  }

  export interface ServerOptions {
    host?: string;
    port?: number;
    server?: HttpServer | HttpsServer;
    path?: string;
    noServer?: boolean;
    clientTracking?: boolean;
    perMessageDeflate?: boolean | object;
    maxPayload?: number;
    skipUTF8Validation?: boolean;
    WebSocket?: typeof WebSocket;
  }

  export class Server extends EventEmitter {
    constructor(options?: ServerOptions, callback?: () => void);
    close(cb?: (err?: Error) => void): void;
    handleUpgrade(
      request: any,
      socket: any,
      upgradeHead: any,
      callback: (client: WebSocket, request: any) => void
    ): void;
    shouldHandle(request: any): boolean;
  }

  export const WebSocket: {
    new (address: string | URL, protocols?: string | string[], options?: any): WebSocket;
    CONNECTING: number;
    OPEN: number;
    CLOSING: number;
    CLOSED: number;
  };
}

// Declare missing utility types
declare function isDevelopment(): boolean;
declare const devLogger: {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (message: string, error?: Error) => void;
  debug: (...args: any[]) => void;
};

declare function fileExists(filePath: string): Promise<boolean>;
