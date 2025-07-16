import express from 'express';
import { 
  likeRecipe, 
  unlikeRecipe, 
  getRecipeLikes, 
  checkLikeStatus,
} from '../handlers/likes';
import { requireAuthAndOwnership } from '../../middleware/clerkAuth';

const router = express.Router();

// POST /:userId/like - Dar like a una receta
router.post('/:userId/like', requireAuthAndOwnership, likeRecipe);

// DELETE /:userId/unlike - Quitar like de una receta
router.delete('/:userId/unlike', requireAuthAndOwnership, unlikeRecipe);

// GET /recipe/:recipeId - Obtener likes de una receta
router.get('/recipe/:recipeId', getRecipeLikes);

// GET /:userId/status/:recipeId - Verificar si el usuario ha dado like a una receta
router.get('/:userId/status/:recipeId', requireAuthAndOwnership, checkLikeStatus);

export default router; 