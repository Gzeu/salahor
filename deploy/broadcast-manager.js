import { EventEmitter } from 'events';
import WebSocket from 'ws';

class BroadcastManager extends EventEmitter {
    constructor() {
        super();
        this.rooms = new Map(); // roomId -> Set<clientId>
        this.clients = new Map(); // clientId -> { ws, userId, rooms: Set<roomId> }
        this.userConnections = new Map(); // userId -> Set<clientId>
    }

    /**
     * Add a client to the broadcast manager
     * @param {string} clientId - Unique client identifier
     * @param {WebSocket} ws - WebSocket connection
     * @param {string} [userId] - User identifier if authenticated
     */
    addClient(clientId, ws, userId = null) {
        const client = { ws, userId, rooms: new Set() };
        this.clients.set(clientId, client);
        
        if (userId) {
            this._addUserConnection(userId, clientId);
        }
        
        return client;
    }

    /**
     * Remove a client from all rooms and clean up
     * @param {string} clientId - Client identifier to remove
     */
    removeClient(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        // Remove from all rooms
        client.rooms.forEach(roomId => {
            this.leaveRoom(clientId, roomId);
        });
        
        // Remove user connection mapping
        if (client.userId) {
            this._removeUserConnection(client.userId, clientId);
        }
        
        // Remove from clients
        this.clients.delete(clientId);
    }

    /**
     * Add a client to a room
     * @param {string} clientId - Client identifier
     * @param {string} roomId - Room identifier
     * @returns {boolean} Success status
     */
    joinRoom(clientId, roomId) {
        const client = this.clients.get(clientId);
        if (!client) return false;

        // Add to room
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }
        this.rooms.get(roomId).add(clientId);
        client.rooms.add(roomId);
        
        this.emit('join', { clientId, roomId });
        return true;
    }

    /**
     * Remove a client from a room
     * @param {string} clientId - Client identifier
     * @param {string} roomId - Room identifier
     * @returns {boolean} Success status
     */
    leaveRoom(clientId, roomId) {
        const client = this.clients.get(clientId);
        if (!client || !this.rooms.has(roomId)) return false;

        // Remove from room
        this.rooms.get(roomId).delete(clientId);
        client.rooms.delete(roomId);
        
        // Clean up empty rooms
        if (this.rooms.get(roomId).size === 0) {
            this.rooms.delete(roomId);
        }
        
        this.emit('leave', { clientId, roomId });
        return true;
    }

    /**
     * Broadcast a message to all clients in a room
     * @param {string} roomId - Room identifier
     * @param {Object} message - Message to broadcast
     * @param {string} [excludeClientId] - Client ID to exclude from broadcast
     */
    broadcastToRoom(roomId, message, excludeClientId = null) {
        if (!this.rooms.has(roomId)) return 0;
        
        const clients = this.rooms.get(roomId);
        let count = 0;
        
        clients.forEach(clientId => {
            if (clientId === excludeClientId) return;
            
            const client = this.clients.get(clientId);
            if (client && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(JSON.stringify(message));
                count++;
            }
        });
        
        return count;
    }

    /**
     * Send a message to a specific client
     * @param {string} clientId - Target client ID
     * @param {Object} message - Message to send
     * @returns {boolean} Success status
     */
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || client.ws.readyState !== WebSocket.OPEN) return false;
        
        try {
            client.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error(`Error sending to client ${clientId}:`, error);
            return false;
        }
    }

    /**
     * Send a message to all connections of a specific user
     * @param {string} userId - Target user ID
     * @param {Object} message - Message to send
     * @returns {number} Number of connections the message was sent to
     */
    sendToUser(userId, message) {
        if (!this.userConnections.has(userId)) return 0;
        
        let count = 0;
        const clientIds = this.userConnections.get(userId);
        
        clientIds.forEach(clientId => {
            if (this.sendToClient(clientId, message)) {
                count++;
            }
        });
        
        return count;
    }

    /**
     * Get all client IDs in a room
     * @param {string} roomId - Room identifier
     * @returns {Set<string>} Set of client IDs
     */
    getClientsInRoom(roomId) {
        return this.rooms.get(roomId) || new Set();
    }

    /**
     * Get all rooms a client is in
     * @param {string} clientId - Client identifier
     * @returns {Set<string>} Set of room IDs
     */
    getClientRooms(clientId) {
        const client = this.clients.get(clientId);
        return client ? new Set(client.rooms) : new Set();
    }

    /**
     * Update user ID for a client (e.g., after authentication)
     * @param {string} clientId - Client identifier
     * @param {string} userId - User identifier
     */
    setClientUserId(clientId, userId) {
        const client = this.clients.get(clientId);
        if (!client) return false;
        
        // Remove from old user's connections if changing user
        if (client.userId) {
            this._removeUserConnection(client.userId, clientId);
        }
        
        // Update user ID and add to user connections
        client.userId = userId;
        if (userId) {
            this._addUserConnection(userId, clientId);
        }
        
        return true;
    }

    /**
     * Get all client IDs for a user
     * @param {string} userId - User identifier
     * @returns {Set<string>} Set of client IDs
     */
    getUserConnections(userId) {
        return this.userConnections.get(userId) || new Set();
    }

    /**
     * Check if a client is in a specific room
     * @param {string} clientId - Client identifier
     * @param {string} roomId - Room identifier
     * @returns {boolean} True if client is in the room
     */
    isClientInRoom(clientId, roomId) {
        const client = this.clients.get(clientId);
        return client ? client.rooms.has(roomId) : false;
    }

    // Private methods
    _addUserConnection(userId, clientId) {
        if (!this.userConnections.has(userId)) {
            this.userConnections.set(userId, new Set());
        }
        this.userConnections.get(userId).add(clientId);
    }

    _removeUserConnection(userId, clientId) {
        if (this.userConnections.has(userId)) {
            const connections = this.userConnections.get(userId);
            connections.delete(clientId);
            
            if (connections.size === 0) {
                this.userConnections.delete(userId);
            }
        }
    }
}

export default BroadcastManager;
