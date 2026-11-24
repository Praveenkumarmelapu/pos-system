import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  get mongoUri() { return process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/retail_pos_saas'; },
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_for_local_dev_only',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  supportEmail: process.env.POS_SUPPORT_EMAIL || '',
  openFoodFactsUrl: process.env.OPEN_FOOD_FACTS_URL || 'https://world.openfoodfacts.org/api/v2/product'
};
