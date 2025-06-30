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

// Configuración de Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Gloo API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
  },
}));

// Endpoint de prueba simple
app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint funcionando' });
});

// Endpoint para obtener el JSON de Swagger
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
