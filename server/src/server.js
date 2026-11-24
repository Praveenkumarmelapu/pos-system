import app from './app.js';
import { connectDB } from './config/db.js';
import { config } from './config/env.js';
import { initializeMasterCategories } from './services/category.service.js';

async function bootstrap() {
  await connectDB();
  await initializeMasterCategories();

  app.listen(config.port, () => {
    console.log(`[Server] Retail POS SaaS Backend running on http://localhost:${config.port}`);
    console.log(`[Server] Environment: ${config.nodeEnv}`);
  });
}

bootstrap().catch(err => {
  console.error('[Bootstrap Error]', err);
  process.exit(1);
});
