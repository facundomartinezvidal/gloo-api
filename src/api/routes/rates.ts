import express from 'express';
import { 
  rateRecipe, 
  updateRate, 
  deleteRate, 
  getRecipeRatings, 
  checkRatingStatus,
} from '../handlers/rates';

const router = express.Router();

// POST /:userId/rate - Calificar una receta
router.post('/:userId/rate', rateRecipe);

// PUT /:userId/rate - Actualizar calificación de una receta
router.put('/:userId/rate', updateRate);

// DELETE /:userId/rate - Eliminar calificación de una receta
router.delete('/:userId/rate', deleteRate);

// GET /recipe/:recipeId - Obtener calificaciones de una receta
router.get('/recipe/:recipeId', getRecipeRatings);

// GET /:userId/status/:recipeId - Verificar si el usuario ha calificado una receta
router.get('/:userId/status/:recipeId', checkRatingStatus);

export default router; 