import express from 'express';
import { 
  likeRecipe, 
  unlikeRecipe, 
  getRecipeLikes, 
  checkLikeStatus,
} from '../handlers/likes';

const router = express.Router();

// POST /:userId/like - Dar like a una receta
router.post('/:userId/like', likeRecipe);

// DELETE /:userId/unlike - Quitar like de una receta
router.delete('/:userId/unlike', unlikeRecipe);

// GET /recipe/:recipeId - Obtener likes de una receta
router.get('/recipe/:recipeId', getRecipeLikes);

// GET /:userId/status/:recipeId - Verificar si el usuario ha dado like a una receta
router.get('/:userId/status/:recipeId', checkLikeStatus);

export default router; 