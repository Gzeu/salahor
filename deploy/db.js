import { MongoClient } from 'mongodb';

class Database {
    constructor() {
        this.client = null;
        this.db = null;
        this.connected = false;
        this.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
        this.DB_NAME = process.env.DB_NAME || 'salahor_ws';
    }

    async connect() {
        if (this.connected) return this.db;
        
        try {
            this.client = new MongoClient(this.MONGO_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 10000,
                socketTimeoutMS: 45000
            });

            await this.client.connect();
            this.db = this.client.db(this.DB_NAME);
            this.connected = true;
            
            // Create indexes
            await this.createIndexes();
            
            console.log('✅ Connected to MongoDB');
            return this.db;
        } catch (error) {
            console.error('❌ MongoDB connection error:', error);
            throw error;
        }
    }

    async createIndexes() {
        try {
            // Create indexes for messages collection
            await this.db.collection('messages').createIndex({ room: 1, createdAt: -1 });
            await this.db.collection('messages').createIndex({ from: 1 });
            await this.db.collection('messages').createIndex({ to: 1 });
            
            // Create indexes for users collection
            await this.db.collection('users').createIndex({ username: 1 }, { unique: true });
            await this.db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true });
            
            console.log('✅ Database indexes created');
        } catch (error) {
            console.error('Error creating indexes:', error);
            throw error;
        }
    }

    async saveMessage(message) {
        try {
            if (!this.connected) await this.connect();
            
            const result = await this.db.collection('messages').insertOne({
                ...message,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            
            return result.ops ? result.ops[0] : null;
        } catch (error) {
            console.error('Error saving message:', error);
            throw error;
        }
    }

    async getMessages(room, limit = 50, before = null) {
        try {
            if (!this.connected) await this.connect();
            
            const query = { room };
            if (before) {
                query.createdAt = { $lt: new Date(before) };
            }
            
            return await this.db.collection('messages')
                .find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .toArray();
        } catch (error) {
            console.error('Error fetching messages:', error);
            throw error;
        }
    }

    async getUser(username) {
        try {
            if (!this.connected) await this.connect();
            return await this.db.collection('users').findOne({ username });
        } catch (error) {
            console.error('Error fetching user:', error);
            throw error;
        }
    }

    async createUser(userData) {
        try {
            if (!this.connected) await this.connect();
            
            const result = await this.db.collection('users').insertOne({
                ...userData,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastSeen: new Date()
            });
            
            return result.ops ? result.ops[0] : null;
        } catch (error) {
            if (error.code === 11000) {
                throw new Error('Username or email already exists');
            }
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async updateUserStatus(userId, status) {
        try {
            if (!this.connected) await this.connect();
            
            await this.db.collection('users').updateOne(
                { _id: userId },
                { 
                    $set: { 
                        status,
                        lastSeen: new Date(),
                        updatedAt: new Date()
                    } 
                }
            );
        } catch (error) {
            console.error('Error updating user status:', error);
            throw error;
        }
    }

    async close() {
        try {
            if (this.client) {
                await this.client.close();
                this.connected = false;
                console.log('MongoDB connection closed');
            }
        } catch (error) {
            console.error('Error closing MongoDB connection:', error);
            throw error;
        }
    }
}

// Export a singleton instance
const db = new Database();
export default db;
