import { createEventStream } from '@salahor/core';
import type { WebSocket as WS, Server as WSServer, ServerOptions as WSServerOptions } from 'ws';
import { createServer as createHttpServer, Server as HttpServer, IncomingMessage } from 'http';
import { createServer as createHttpsServer, Server as HttpsServer } from 'https';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { devLogger, isDev } from '../utils/logger';

export interface WebSocketServerOptions {
  port?: number;
  host?: string;
  server?: HttpServer | HttpsServer;
  ssl?: {
    key: string | Buffer;
    cert: string | Buffer;
    passphrase?: string;
  };
  path?: string;
  maxPayload?: number;
  clientTracking?: boolean;
  perMessageDeflate?: boolean | object;
  handleProtocols?: (protocols: Set<string>, request: IncomingMessage) => string | false;
  debug?: boolean;
}

export class WebSocketServer {
  private wss: WSServer;
  private server: HttpServer | HttpsServer;
  private options: Required<Omit<WebSocketServerOptions, 'server' | 'ssl'>> & {
    server: HttpServer | HttpsServer | null;
    ssl: WebSocketServerOptions['ssl'];
  };
  private clients: Set<WS> = new Set();
  private isListening = false;
  private messageStream = createEventStream<{ socket: WS; message: any; isBinary: boolean }>();
  private connectionStream = createEventStream<{ socket: WS; request: IncomingMessage }>();
  private closeStream = createEventStream<void>();
  private errorStream = createEventStream<Error>();

  constructor(options: WebSocketServerOptions = {}) {
    this.options = {
      port: options.port ?? 8080,
      host: options.host ?? '0.0.0.0',
      server: options.server ?? null,
      ssl: options.ssl,
      path: options.path ?? '/',
      maxPayload: options.maxPayload ?? 104857600, // 100MB
      clientTracking: options.clientTracking ?? true,
      perMessageDeflate: options.perMessageDeflate ?? true,
      handleProtocols: options.handleProtocols ?? ((protocols) => Array.from(protocols)[0] || ''),
      debug: options.debug ?? isDev(),
    };

    this.server = this.createServer();
    this.wss = this.createWebSocketServer();
    this.setupEventHandlers();
  }

  private createServer(): HttpServer | HttpsServer {
    if (this.options.server) {
      return this.options.server;
    }

    if (this.options.ssl) {
      const sslOptions = {
        key: typeof this.options.ssl.key === 'string' 
          ? readFileSync(this.options.ssl.key) 
          : this.options.ssl.key,
        cert: typeof this.options.ssl.cert === 'string' 
          ? readFileSync(this.options.ssl.cert) 
          : this.options.ssl.cert,
        passphrase: this.options.ssl.passphrase,
      };
      return createHttpsServer(sslOptions);
    }

    return createHttpServer();
  }

  private createWebSocketServer(): WSServer {
    const WebSocket = this.getWebSocketImplementation();
    
    return new WebSocket.Server({
      server: this.server,
      path: this.options.path,
      maxPayload: this.options.maxPayload,
      clientTracking: this.options.clientTracking,
      perMessageDeflate: this.options.perMessageDeflate,
      handleProtocols: this.options.handleProtocols,
    });
  }

  private setupEventHandlers(): void {
    this.wss.on('connection', (socket: WS, request: IncomingMessage) => {
      if (this.options.clientTracking) {
        this.clients.add(socket);
      }

      socket.on('message', (data: any, isBinary: boolean) => {
        try {
          const message = isBinary ? data : data.toString();
          this.messageStream.next({ socket, message, isBinary });
        } catch (error) {
          this.errorStream.next(error as Error);
        }
      });

      socket.on('close', () => {
        if (this.options.clientTracking) {
          this.clients.delete(socket);
        }
      });

      this.connectionStream.next({ socket, request });
    });

    this.wss.on('error', (error: Error) => {
      this.errorStream.next(error);
    });
  }

  async start(): Promise<void> {
    if (this.isListening) {
      return;
    }

    return new Promise((resolve, reject) => {
      if (!this.options.server) {
        this.server.listen(this.options.port, this.options.host, () => {
          this.isListening = true;
          if (this.options.debug) {
            devLogger(`WebSocket server listening on ${this.options.host}:${this.options.port}${this.options.path}`);
          }
          resolve();
        });

        this.server.on('error', (error: Error) => {
          this.errorStream.next(error);
          reject(error);
        });
      } else {
        this.isListening = true;
        resolve();
      }
    });
  }

  async stop(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    return new Promise((resolve, reject) => {
      // Close all client connections
      for (const client of this.clients) {
        if (client.readyState === client.OPEN) {
          client.close(1000, 'Server shutting down');
        }
      }

      // Close the WebSocket server
      this.wss.close((error) => {
        if (error) {
          this.errorStream.next(error);
          reject(error);
          return;
        }

        // Close the HTTP/HTTPS server if we created it
        if (!this.options.server) {
          this.server.close((err) => {
            this.isListening = false;
            if (err) {
              this.errorStream.next(err);
              reject(err);
              return;
            }
            this.closeStream.next();
            resolve();
          });
        } else {
          this.isListening = false;
          this.closeStream.next();
          resolve();
        }
      });
    });
  }

  broadcast(message: any, isBinary: boolean = false): void {
    const data = isBinary ? message : JSON.stringify(message);
    
    for (const client of this.clients) {
      if (client.readyState === client.OPEN) {
        try {
          client.send(data, { binary: isBinary });
        } catch (error) {
          this.errorStream.next(error as Error);
        }
      }
    }
  }

  onMessage(callback: (data: { socket: WS; message: any; isBinary: boolean }) => void): () => void {
    return this.messageStream.subscribe({
      next: callback,
      error: (error) => this.errorStream.next(error),
      complete: () => {},
    }).unsubscribe;
  }

  onConnection(callback: (data: { socket: WS; request: IncomingMessage }) => void): () => void {
    return this.connectionStream.subscribe({
      next: callback,
      error: (error) => this.errorStream.next(error),
      complete: () => {},
    }).unsubscribe;
  }

  onClose(callback: () => void): () => void {
    return this.closeStream.subscribe({
      next: callback,
      error: (error) => this.errorStream.next(error),
      complete: () => {},
    }).unsubscribe;
  }

  onError(callback: (error: Error) => void): () => void {
    return this.errorStream.subscribe({
      next: callback,
      error: (error) => console.error('Error in error handler:', error),
      complete: () => {},
    }).unsubscribe;
  }

  getClients(): Set<WS> {
    return new Set(this.clients);
  }

  private getWebSocketImplementation(): typeof import('ws') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('ws');
    } catch (error) {
      throw new Error(
        'ws package is required for WebSocket server. Please install it with: npm install ws'
      );
    }
  }

  static create(options: WebSocketServerOptions = {}): WebSocketServer {
    return new WebSocketServer(options);
  }
}

// Utility function for creating a simple WebSocket server
export async function createWebSocketServer(
  options: WebSocketServerOptions = {}
): Promise<WebSocketServer> {
  const server = new WebSocketServer(options);
  await server.start();
  return server;
}

// Default export for backward compatibility
export default WebSocketServer;
