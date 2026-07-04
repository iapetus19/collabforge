import mongoose from 'mongoose';
import logger from '../shared/logger/winston.js';
import env from './env.js';

const connectDB = async () => {
 try {
  await mongoose.connect(env.MONGO_URI);
  logger.info('MongoDB connected successfully');
} catch (error) {
    logger.error('MongoDB connection failed', { error: error.message });
    process.exit(1);
}
};

mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

export default connectDB;
