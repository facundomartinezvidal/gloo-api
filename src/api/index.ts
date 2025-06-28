import express from 'express';

import emojis from './emojis';
import { recipe } from '../db/schema';
import { db } from '../db';

const router = express.Router();

// Ruta para obtener todas las recetas
router.get('/recipes', async (req, res) => {
  try {
    const recipes = await db.select().from(recipe);
    res.json({
      success: true,
      count: recipes.length,
      recipes,
    });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las recetas',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

router.get('/', (req, res) => {
  res.json({
    message: 'API - 👋🌎🌍🌏',
  });
});

router.use('/emojis', emojis);

export default router;
