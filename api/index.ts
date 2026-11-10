import type { IncomingMessage, ServerResponse } from 'http';
import app from '../server/app.ts';
import { initDatabase } from '../server/db.ts';

let isInitialized = false;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!isInitialized) {
    try {
      await initDatabase();
      isInitialized = true;
    } catch (err) {
      console.error('[FLASH-SHOP Vercel] Erreur init base de données:', err);
    }
  }
  return app(req as any, res as any);
}
