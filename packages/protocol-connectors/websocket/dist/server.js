import { createEventStream } from '@salahor/core';
import { devLogger, isDev } from './utils';
/**
 * Creates a WebSocket connection wrapper
 */
function createWebSocketConnection(ws, request) {
    const id = Math.random().toString(36).substring(2, 15);
    const remoteAddress = request.socket?.remoteAddress || 'unknown';
    const messages = createEventStream();
    const errorEvents = createEventStream();
    let isOpen = true;
    // Set up message handler
    ws.on('message', (data) => {
        // Convert Buffer to ArrayBuffer if needed
        const message = data instanceof Buffer ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : data;
        messages.emit(message);
    });
    // Set up error handler
    ws.on('error', (error) => {
        errorEvents.emit(error);
    });
    const closePromise = new Promise((resolve) => {
        const onClose = (code, reason) => {
            isOpen = false;
            messages.complete();
            errorEvents.complete();
            // Create a CloseEvent-like object
            const event = new CloseEvent('close', {
                wasClean: true,
                code,
                reason: reason?.toString() || ''
            });
            resolve(event);
        };
        ws.on('close', onClose);
    });
    const connection = {
        get socket() { return ws; },
        get id() { return id; },
        get remoteAddress() { return remoteAddress; },
        get messages() { return messages; },
        get isOpen() { return isOpen; },
        get readyState() {
            // Map internal ws readyState to standard WebSocket readyState values
            switch (ws.readyState) {
                case 0: return 0; // CONNECTING
                case 1: return 1; // OPEN
                case 2: return 2; // CLOSING
                case 3: return 3; // CLOSED
                default: return 3; // Default to CLOSED for unknown states
            }
        },
        get onClose() { return closePromise; },
        get onError() { return errorEvents; },
        send(data) {
            if (isOpen) {
                try {
                    ws.send(data);
                }
                catch (error) {
                    console.error(`[WebSocketServer] Error sending to client ${id}:`, error);
                    throw error;
                }
            }
        },
        close(code, reason) {
            if (isOpen) {
                isOpen = false;
                ws.close(code, reason);
            }
        }
    };
    return connection;
}
/**
 * Creates a new WebSocket server instance
 */
export async function createWebSocketServer(options = {}) {
    if (isDev) {
        devLogger.log('[WebSocket] createWebSocketServer called at:', new Date().toISOString());
    }
    console.log('[WebSocket] createWebSocketServer called with options:', JSON.stringify({
        ...options,
        // Don't log the entire server object
        server: options.server ? `[HTTP Server: ${options.server?.listening ? 'listening' : 'not listening'}]` : 'undefined',
    }, null, 2));
    // Debug: Log the current working directory
    console.log('[WebSocket] Current working directory:', process.cwd());
    // Check if we're running in a test environment
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    console.log('[WebSocket] Is test environment:', isTestEnv);
    // Check if we can require the 'ws' module
    let wsModule;
    try {
        wsModule = await import('ws');
        console.log('[WebSocket] Successfully imported ws module');
    }
    catch (error) {
        console.error('[WebSocket] Failed to import ws module:', error);
        throw new Error('Failed to import WebSocket module');
    }
    const { port, host = '0.0.0.0', server: httpServer, wsOptions = {}, } = options;
    console.log(`[WebSocket] Extracted options - port: ${port}, host: ${host}, hasHttpServer: ${!!httpServer}`);
    // Event streams
    const connections = createEventStream();
    const disconnections = createEventStream();
    const closeEvents = createEventStream();
    const errorEvents = createEventStream();
    // Connection tracking
    const activeConnections = new Map();
    let isClosed = false;
    let wss = null;
    // Import the WebSocketServer from 'ws' package
    let WebSocketServer;
    try {
        console.log('[WebSocket] Attempting to import WebSocketServer...');
        // Try ESM dynamic import first (works in modern Node.js and bundlers)
        const wsModule = await import('ws');
        console.log('[WebSocket] Successfully imported ws module');
        // Handle both direct and default exports
        WebSocketServer = wsModule.WebSocketServer || wsModule.default?.WebSocketServer || wsModule.Server || wsModule.default?.Server;
        console.log('[WebSocket] WebSocketServer constructor:', WebSocketServer ? 'found' : 'not found');
        if (wsModule.WebSocketServer)
            console.log('[WebSocket] Found WebSocketServer in wsModule');
        if (wsModule.default?.WebSocketServer)
            console.log('[WebSocket] Found WebSocketServer in wsModule.default');
        if (wsModule.Server)
            console.log('[WebSocket] Found Server in wsModule');
        if (wsModule.default?.Server)
            console.log('[WebSocket] Found Server in wsModule.default');
    }
    catch (error) {
        console.error('[WebSocket] Failed to import WebSocketServer:', error);
        throw new Error('Failed to initialize WebSocket server: Missing required WebSocket server implementation');
    }
    if (!WebSocketServer) {
        console.error('[WebSocket] WebSocketServer constructor is null or undefined');
        throw new Error('Failed to find WebSocket server implementation');
    }
    // Create the WebSocket server instance
    let server = null;
    try {
        console.log('[WebSocket] Creating WebSocket server instance...');
        console.log(`[WebSocket] Using httpServer: ${!!httpServer}, port: ${port}, host: ${host}`);
        if (httpServer) {
            console.log('[WebSocket] Creating WebSocket server with existing HTTP server');
            server = new WebSocketServer({
                server: httpServer,
                ...wsOptions,
            });
        }
        else if (port) {
            console.log(`[WebSocket] Creating WebSocket server on port ${port} and host ${host}`);
            server = new WebSocketServer({
                port,
                host,
                ...wsOptions,
            });
        }
        else {
            const errorMsg = '[WebSocket] Either server or port must be provided';
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        console.log('[WebSocket] WebSocket server instance created successfully');
    }
    catch (error) {
        console.error('[WebSocket] Error creating WebSocket server:', error);
        throw error;
    }
    // Helper function to handle broadcast messages
    async function handleBroadcastMessage(message, sender) {
        if (isClosed)
            return;
        const sendPromises = [];
        for (const [id, connection] of activeConnections.entries()) {
            // Don't send back to the sender
            if (id === sender.id)
                continue;
            // Create a promise for each send operation
            const sendPromise = new Promise((resolve) => {
                try {
                    if (connection.isOpen) {
                        connection.send(message);
                        resolve();
                    }
                    else {
                        // If connection is closed, remove it from active connections
                        activeConnections.delete(id);
                        resolve();
                    }
                }
                catch (error) {
                    console.error(`[WebSocketServer] Error sending to client ${id}:`, error);
                    // Remove the connection if there was an error
                    activeConnections.delete(id);
                    resolve(); // Resolve anyway to continue with other connections
                }
            });
            sendPromises.push(sendPromise);
        }
        // Wait for all send operations to complete
        await Promise.all(sendPromises);
    }
    // Create the WebSocket server API object
    const webSocketServer = {
        async start(serverPort = port || 8080) {
            console.log(`[WebSocketServer] Starting server on port ${serverPort}...`);
            if (wss && !isClosed) {
                console.log('[WebSocketServer] Server is already running');
                return;
            }
            return new Promise((resolve, reject) => {
                try {
                    // Close existing server if it exists
                    if (wss) {
                        wss.close();
                    }
                    // Create new WebSocket server
                    console.log('[WebSocketServer] Creating WebSocket server instance...');
                    wss = new WebSocketServer({ port: serverPort, host, ...wsOptions });
                    isClosed = false;
                    console.log(`[WebSocketServer] WebSocket server created, waiting for 'listening' event...`);
                    // Add a one-time listener for the 'listening' event
                    wss.once('listening', () => {
                        const address = wss?.address();
                        const listenPort = typeof address === 'string' ? address : address?.port;
                        console.log(`[WebSocketServer] Server is now listening on ${host}:${listenPort}`);
                    });
                    // Add error handler for server errors
                    wss.on('error', (error) => {
                        console.error('[WebSocketServer] WebSocket server error:', error);
                    });
                    wss.on('connection', (ws, request) => {
                        if (isClosed) {
                            console.log('[WebSocketServer] Rejecting new connection - server is closing');
                            ws.close(1013, 'Server is shutting down');
                            return;
                        }
                        const connection = createWebSocketConnection(ws, request);
                        activeConnections.set(connection.id, connection);
                        console.log(`[WebSocketServer] New connection: ${connection.id} from ${connection.remoteAddress}`);
                        console.log(`[WebSocketServer] Active connections: ${activeConnections.size}`);
                        // Log all active connections for debugging
                        if (activeConnections.size % 10 === 0) {
                            console.log('[WebSocketServer] Current connection IDs:', Array.from(activeConnections.keys()).join(', '));
                        }
                        // Handle incoming messages from this connection
                        const messageSubscription = connection.messages.subscribe({
                            next: (message) => {
                                try {
                                    if (typeof message === 'string' && message.startsWith('broadcast:')) {
                                        // Handle broadcast message
                                        const broadcastMessage = message.slice('broadcast:'.length);
                                        // Pass the connection object instead of just the ID
                                        handleBroadcastMessage(broadcastMessage, connection).catch(error => {
                                            console.error(`[WebSocketServer] Error in broadcast for ${connection.id}:`, error);
                                        });
                                    }
                                    else if (options.echo !== false) {
                                        // Echo the message back to the client
                                        connection.send(message).catch(error => {
                                            console.error(`[WebSocketServer] Error echoing message to ${connection.id}:`, error);
                                        });
                                    }
                                }
                                catch (error) {
                                    console.error(`[WebSocketServer] Error processing message from ${connection.id}:`, error);
                                }
                            },
                            error: (error) => {
                                const errorMessage = error instanceof Error ? error.message : String(error);
                                console.error(`[WebSocketServer] Error in message stream for ${connection.id}:`, errorMessage);
                            },
                            complete: () => {
                                // Clean up when message stream completes
                                if (activeConnections.delete(connection.id)) {
                                    console.log(`[WebSocketServer] Connection completed: ${connection.id}`);
                                    console.log(`[WebSocketServer] Remaining connections: ${activeConnections.size}`);
                                }
                            }
                        });
                        // Handle connection close
                        connection.onClose.finally(() => {
                            if (activeConnections.delete(connection.id)) {
                                console.log(`[WebSocketServer] Connection closed: ${connection.id}`);
                                console.log(`[WebSocketServer] Remaining connections: ${activeConnections.size}`);
                                disconnections.emit(connection);
                                // No need to call unsubscribe as it's handled by the complete event
                            }
                        });
                        // Forward new connection to subscribers
                        connections.emit(connection);
                    });
                    // Set up error handler
                    if (wss) {
                        wss.on('error', (error) => {
                            console.error('[WebSocketServer] Server error:', error);
                            errorEvents.emit(error);
                        });
                    }
                    // Set up close handler
                    if (wss) {
                        wss.on('close', () => {
                            console.log('[WebSocketServer] Server closed');
                            isClosed = true;
                            closeEvents.emit();
                        });
                    }
                    resolve();
                }
                catch (error) {
                    console.error('[WebSocketServer] Failed to start server:', error);
                    reject(error);
                }
            });
        },
        get server() {
            return wss;
        },
        /**
         * Stream of new connections.
         */
        get connections() {
            return connections;
        },
        /**
         * Stream of disconnections.
         */
        get disconnections() {
            return disconnections;
        },
        /**
         * Map of active connections by connection ID.
         */
        get activeConnections() {
            return new Map(activeConnections);
        },
        /**
         * Close the server and all connections.
         */
        async close() {
            if (isClosed)
                return;
            isClosed = true;
            console.log('[WebSocketServer] Closing server...');
            // Close all active connections
            const closePromises = Array.from(activeConnections.values()).map(connection => new Promise((resolve) => {
                try {
                    if (connection.isOpen) {
                        connection.close(1001, 'Server shutting down');
                    }
                }
                catch (error) {
                    console.error(`[WebSocketServer] Error closing connection ${connection.id}:`, error);
                }
                finally {
                    resolve();
                }
            }));
            // Wait for all connections to close or timeout
            await Promise.race([
                Promise.all(closePromises),
                new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
            ]);
            // Close the server
            return new Promise((resolve, reject) => {
                wss.close((error) => {
                    if (error) {
                        console.error('[WebSocketServer] Error closing server:', error);
                        reject(error);
                    }
                    else {
                        console.log('[WebSocketServer] Server closed successfully');
                        // Clean up resources
                        connections.complete();
                        disconnections.complete();
                        errorEvents.complete();
                        closeEvents.emit();
                        closeEvents.complete();
                        resolve();
                    }
                });
            });
        },
        /**
         * Event emitted when the server is closed.
         */
        get onClose() {
            return closeEvents;
        },
        /**
         * Event emitted when an error occurs.
         */
        get onError() {
            return errorEvents;
        },
        /**
         * Broadcasts a message to all connected clients.
         * @param message The message to broadcast
         * @returns The number of clients that received the message
         */
        broadcast(message) {
            if (isClosed)
                return 0;
            const clients = Array.from(activeConnections.values());
            if (clients.length === 0)
                return 0;
            let successCount = 0;
            // Prepare the message once for all clients
            const messageToSend = (() => {
                if (typeof message === 'string' || message instanceof ArrayBuffer || message instanceof Blob) {
                    return message;
                }
                else if (ArrayBuffer.isView(message)) {
                    return message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength);
                }
                console.error(`[WebSocketServer] Unsupported message type: ${typeof message}`);
                return null;
            })();
            if (messageToSend === null)
                return 0;
            // Send to all connected clients
            for (const [id, client] of activeConnections.entries()) {
                try {
                    if (client.isOpen) {
                        client.send(messageToSend);
                        successCount++;
                    }
                    else {
                        console.log(`[WebSocketServer] Removing closed client ${id} during broadcast`);
                        activeConnections.delete(id);
                    }
                }
                catch (error) {
                    console.error(`[WebSocketServer] Error broadcasting to client ${id}:`, error);
                    if (!client.isOpen) {
                        activeConnections.delete(id);
                    }
                }
            }
            return successCount;
        },
    };
    // Return the WebSocket server instance
    return webSocketServer;
}
export default createWebSocketServer;
//# sourceMappingURL=server.js.map