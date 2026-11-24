import mongoose from 'mongoose';
import { config } from './env.js';

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    isConnected = true;
    console.log(`[Database] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error(`[Database Error] Could not connect to MongoDB: ${err.message}`);
    // Don't kill process immediately in dev so app can attempt recovery or mock if necessary
    if (config.nodeEnv === 'production') {
      // Serverless: never kill the process; let the request handler return 503 and retry on the next request.
      throw err;
    }
  }
}

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('[Database] MongoDB connection disconnected.');
});
