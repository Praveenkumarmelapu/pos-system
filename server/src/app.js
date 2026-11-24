import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import barcodeRoutes from './routes/barcode.routes.js';
import saleRoutes from './routes/sale.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import reportRoutes from './routes/report.routes.js';
import customerRoutes from './routes/customer.routes.js';
import khataRoutes from './routes/khata.routes.js';
import shopRoutes from './routes/shop.routes.js';
import adminRoutes from './routes/admin.routes.js';
import categoryRoutes from './routes/category.routes.js';

const app = express();

// Security & Core Middleware
app.use(helmet());
app.use(cors({
  origin: [config.corsOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Retail POS SaaS API'
  });
});

// Mount Versioned Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/barcodes', barcodeRoutes);
app.use('/api/v1/sales', saleRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/khata', khataRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/shop', shopRoutes);
app.use('/api/v1/admin', adminRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    }
  });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
