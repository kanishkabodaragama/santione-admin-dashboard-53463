const mongoose = require('mongoose');

class DatabaseService {
  constructor() {
    this.connection = null;
  }

  // PUBLIC_INTERFACE
  /**
   * Connect to MongoDB database
   * @returns {Promise} Database connection promise
   */
  async connect() {
    try {
      const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/santione_db';
      
      this.connection = await mongoose.connect(mongoUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      console.log('Connected to MongoDB successfully');
      return this.connection;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Disconnect from MongoDB database
   * @returns {Promise} Disconnection promise
   */
  async disconnect() {
    try {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('MongoDB disconnection error:', error);
      throw error;
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get database connection status
   * @returns {Object} Connection status object
   */
  getConnectionStatus() {
    return {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }
}

module.exports = new DatabaseService();
