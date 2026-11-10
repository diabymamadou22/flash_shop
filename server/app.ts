import express from 'express';
import dotenv from 'dotenv';

import authRouter from './routes/authRouter.ts';
import productsRouter from './routes/productsRouter.ts';
import categoriesRouter from './routes/categoriesRouter.ts';
import salesRouter from './routes/salesRouter.ts';
import stockRouter from './routes/stockRouter.ts';
import expensesRouter from './routes/expensesRouter.ts';
import dashboardRouter from './routes/dashboardRouter.ts';
import settingsRouter from './routes/settingsRouter.ts';

dotenv.config();

export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Normalisation des URLs (compatible Express local et Vercel Serverless Function)
app.use((req, res, next) => {
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/dist') && !req.url.startsWith('/assets')) {
    req.url = '/api' + req.url;
  }
  if (req.path.startsWith('/api')) {
    console.log(`[API ${req.method}] ${req.path}`);
  }
  next();
});

// Enregistrement des routes API
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/sales', salesRouter);
app.use('/api/stock', stockRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/settings', settingsRouter);

export default app;
