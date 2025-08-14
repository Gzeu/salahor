import { createEventStream } from '@salahor/core';
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
export function createWebSocketServer(options = {}) {
    const { port, host = '0.0.0.0', server: httpServer, wsOptions = {}, } = options;
    // Event streams
    const connections = createEventStream();
    const disconnections = createEventStream();
    const closeEvents = createEventStream();
    const errorEvents = createEventStream();
    // Connection tracking
    const activeConnections = new Map();
    let isClosed = false;
    // Get WebSocket server implementation
    let WebSocketServerImpl;
    try {
        const ws = await import('ws');
        WebSocketServerImpl = ws.Server;
    }
    catch (error) {
        throw new Error('No WebSocket server implementation found. Please install the "ws" package or provide a custom implementation.');
    }
    // Create WebSocket server instance
    const wsServerOptions = {
        ...(port !== undefined && { port }),
        ...(host !== undefined && { host }),
        ...(httpServer !== undefined && { server: httpServer }),
        ...wsOptions,
    };
    const wss = new WebSocketServerImpl(wsServerOptions);
    // Handle new connections
    wss.on('connection', (ws, request = {}) => {
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
                    // Debug logging if enabled
                    if (process.env.DEBUG) {
                        let messageStr;
                        if (typeof message === 'string') {
                            messageStr = message;
                        }
                        else if (message instanceof ArrayBuffer) {
                            messageStr = `[binary data: ${message.byteLength} bytes]`;
                        }
                        else if (message instanceof Blob) {
                            messageStr = `[blob data: ${message.size} bytes]`;
                        }
                        else {
                            messageStr = '[unknown message type]';
                        }
                        console.log(`[WebSocketServer] Received from ${connection.id}:`, messageStr);
                    }
                }
                catch (error) {
                    console.error('[WebSocketServer] Error processing message:', error);
                }
            },
            error: (error) => {
                console.error(`[WebSocketServer] Error in message stream for ${connection.id}:`, error);
            },
            complete: () => {
                // Clean up resources when the message stream completes
                if (activeConnections.delete(connection.id)) {
                    console.log(`[WebSocketServer] Connection completed: ${connection.id}`);
                    console.log(`[WebSocketServer] Remaining connections: ${activeConnections.size}`);
                }
            }
        });
        // Handle connection close
        connection.onClose.finally(() => {
            // Clean up resources
            if (activeConnections.delete(connection.id)) {
                console.log(`[WebSocketServer] Connection closed: ${connection.id}`);
                console.log(`[WebSocketServer] Remaining connections: ${activeConnections.size}`);
                disconnections.emit(connection);
                messageSubscription.unsubscribe();
            }
        });
        // Forward new connection to subscribers
        connections.emit(connection);
    });
    // Handle server errors
    wss.on('error', (error) => {
        console.error('[WebSocketServer] Server error:', error);
        errorEvents.emit(error);
    });
    // Handle server close
    wss.on('close', () => {
        console.log('[WebSocketServer] Server closed');
        isClosed = true;
        closeEvents.emit();
    });
    // Public API
    const server = {
        /**
         * The underlying WebSocket server instance.
         */
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
}
export default createWebSocketServer;
//# sourceMappingURL=server.new.js.map