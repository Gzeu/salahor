import { createEventStream } from '@salahor/core';
class ConnectionError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'ConnectionError';
    }
}
export function createWebSocketClient(url, options = {}) {
    const { reconnectDelay = 1000, maxReconnectAttempts = Infinity, WebSocket: WebSocketImpl = getDefaultWebSocket(), wsOptions = {}, } = options;
    let socket = null;
    let reconnectAttempts = 0;
    let reconnectTimeout = null;
    let isExplicitlyClosed = false;
    // Create event streams
    const messages = createEventStream();
    const openEvents = createEventStream();
    const closeEvents = createEventStream();
    const errorEvents = createEventStream();
    const checkRequiredFiles = async () => {
        // Skip file checks in development if explicitly disabled
        const skipFileChecks = isDevelopment() && process.env.SKIP_FILE_CHECKS === 'true';
        if (skipFileChecks) {
            devLogger.log('Skipping file existence checks in development (SKIP_FILE_CHECKS=true)');
            return;
        }
        // Check if we have any certificate or key files in the options
        const certFiles = [
            wsOptions.cert,
            wsOptions.key,
            wsOptions.ca,
            // Check for any additional files that might be needed
            ...wsOptions.pfx ? [wsOptions.pfx] : [],
            ...wsOptions.passphrase ? [] : [], // Skip passphrase as it's not a file
        ].filter(Boolean);
        for (const file of certFiles) {
            if (file && typeof file === 'string') {
                const exists = await fileExists(file);
                if (!exists) {
                    const errorMsg = `Required file not found: ${file}`;
                    if (isDevelopment()) {
                        devLogger.warn(errorMsg);
                        devLogger.log('To skip file checks in development, set SKIP_FILE_CHECKS=true');
                    }
                    throw new ConnectionError(errorMsg, 'ENOENT');
                }
                else if (isDevelopment()) {
                    devLogger.debug(`Verified file exists: ${file}`);
                }
            }
        }
    };
    const connect = async () => {
        if (socket) {
            cleanupSocket();
        }
        try {
            // Check for required files before attempting to connect
            await checkRequiredFiles();
            // If we get here, all files exist, proceed with connection
            if (isDevelopment()) {
                devLogger.log(`Connecting to WebSocket: ${url}`);
            }
            socket = new WebSocketImpl(url, [], wsOptions);
            setupSocket();
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorCode = error instanceof ConnectionError ? error.code : 'ECONNFAILED';
            const errorMsg = `Failed to create WebSocket (${errorCode}): ${errorMessage}`;
            if (isDevelopment()) {
                devLogger.error(errorMsg, error instanceof Error ? error : undefined);
            }
            else {
                console.error(errorMsg);
            }
            // Emit error event
            errorEvents.emit(new ErrorEvent('error', {
                message: errorMessage,
                error: error instanceof Error ? error : new Error(errorMessage)
            }));
            scheduleReconnect();
        }
    };
    const setupSocket = () => {
        if (!socket)
            return;
        socket.onopen = (event) => {
            reconnectAttempts = 0;
            openEvents.emit(event);
        };
        socket.onmessage = (event) => {
            messages.emit(event.data);
        };
        socket.onclose = (event) => {
            closeEvents.emit(event);
            cleanupSocket();
            if (!isExplicitlyClosed && (maxReconnectAttempts === Infinity || reconnectAttempts < maxReconnectAttempts)) {
                scheduleReconnect();
            }
        };
        socket.onerror = (event) => {
            errorEvents.emit(event);
        };
    };
    const cleanupSocket = () => {
        if (!socket)
            return;
        socket.onopen = null;
        socket.onmessage = null;
        socket.onclose = null;
        socket.onerror = null;
        if (socket.readyState === WebSocketImpl.OPEN) {
            socket.close();
        }
        socket = null;
    };
    const scheduleReconnect = () => {
        if (isExplicitlyClosed)
            return;
        reconnectAttempts++;
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
        }
        reconnectTimeout = setTimeout(() => {
            if (!isExplicitlyClosed) {
                connect();
            }
        }, reconnectDelay);
    };
    // Auto-connect
    connect();
    // Public API
    return {
        get socket() {
            return socket;
        },
        get messages() {
            return messages;
        },
        get isConnected() {
            return socket?.readyState === WebSocketImpl.OPEN;
        },
        send(data) {
            if (this.isConnected && socket) {
                socket.send(data);
            }
            else {
                console.warn('Cannot send message: WebSocket is not connected');
            }
        },
        close(code, reason) {
            isExplicitlyClosed = true;
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
            }
            if (socket) {
                socket.close(code, reason);
            }
        },
        reconnect: () => {
            if (!isExplicitlyClosed) {
                reconnectAttempts = 0;
                connect().catch(error => {
                    console.error('Error during reconnection:', error);
                });
            }
        },
        get onOpen() {
            return openEvents;
        },
        get onClose() {
            return closeEvents;
        },
        get onError() {
            return errorEvents;
        },
    };
}
function getDefaultWebSocket() {
    if (typeof WebSocket !== 'undefined') {
        return WebSocket;
    }
    try {
        // For Node.js environment
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require('ws');
    }
    catch (error) {
        throw new Error('WebSocket is not available in this environment. ' +
            'Please provide a WebSocket implementation via the options.');
    }
}
//# sourceMappingURL=client.js.map