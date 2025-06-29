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
app.use(cors());
app.use(express.json());

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
