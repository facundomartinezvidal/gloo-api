import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';

import * as middlewares from './middlewares';
import api from './api';
import { recipe } from './db/schema';
import { db } from './db';

require('dotenv').config();

const app = express();

app.use(morgan('dev'));
app.use(helmet());

// Configuración CORS más específica para evitar redirecciones en preflight
app.use(cors({
  origin: true, // Permitir todos los orígenes en desarrollo
  credentials: true, // Permitir credenciales
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Métodos permitidos
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'], // Headers permitidos
  preflightContinue: false, // No continuar con preflight
  optionsSuccessStatus: 204 // Status para OPTIONS exitoso
}));

app.use(express.json());

// Middleware para manejar peticiones OPTIONS específicamente
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.status(204).end();
    return;
  }
  next();
});

app.get('/', async (req, res) => {
  const recipes = await db.select().from(recipe);
  res.json({
    message: '🦄🌈✨👋🌎🌍🌏✨🌈🦄',
    recipes,
  });
});

app.use('/api/v1', api);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default app;
