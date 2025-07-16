import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';

import * as middlewares from './middlewares';
import api from './api';
import swaggerSpecs from './api/swagger';
import { recipe } from './db/schema';
import { db } from './db';

require('dotenv').config();

const app = express();

app.use(morgan('dev'));
app.use(helmet());

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

app.use(express.json());

// Middleware de debug para capturar todas las peticiones
app.use((req, res, next) => {
  console.log('🔍 Global Debug - URL:', req.originalUrl);
  console.log('🔍 Global Debug - Method:', req.method);
  console.log('🔍 Global Debug - Headers:', {
    authorization: req.headers.authorization ? 'Present' : 'Missing',
    'content-type': req.headers['content-type'],
    'user-agent': req.headers['user-agent']?.substring(0, 50) + '...',
  });
  console.log('🔍 Global Debug - Params:', req.params);
  console.log('🔍 Global Debug - Query:', req.query);
  console.log('🔍 Global Debug - Body keys:', Object.keys(req.body || {}));
  console.log('---');
  next();
});

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

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Gloo API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
  },
}));

app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint funcionando' });
});

app.get('/api-docs.json', (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerSpecs);
  } catch (error) {
    console.error('Error en swagger specs:', error);
    res.status(500).json({ error: 'Error loading swagger specs' });
  }
});

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default app;
