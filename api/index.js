// Vercel serverless entry: all /api/* requests are rewritten here.
import mongoose from 'mongoose';
import app from '../server/src/app.js';
import { connectDB } from '../server/src/config/db.js';
import { initializeMasterCategories } from '../server/src/services/category.service.js';

let ready = false;

async function init() {
  if (ready) return;
  await connectDB();
  // Master categories are pre-seeded; only run the slow full init on an empty database.
  // (It is ~100 sequential writes and would exceed the function timeout on cold start.)
  const count = await mongoose.connection.db.collection('categories').estimatedDocumentCount();
  if (count === 0) {
    await initializeMasterCategories();
  }
  ready = true;
}

export default async function handler(req, res) {
  try {
    await init();
  } catch (err) {
    res.statusCode = 503;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Service is starting, please retry in a few seconds.' }
    }));
    return;
  }
  return app(req, res);
}
