import express from 'express';
import { getAllRecipes, createRecipe, getRecipesByUser, updateRecipe, deleteRecipe, getTrendingRecipes, getRecipeById } from '../handlers/recipes';
import { requireAuthAndOwnership, requireAuth } from '../../middleware/clerkAuth';

const router = express.Router();

router.get('/', getAllRecipes);
router.get('/trending', getTrendingRecipes);
router.get('/user/:userId', getRecipesByUser);
router.get('/:id', getRecipeById);
router.post('/:userId', requireAuthAndOwnership, createRecipe);
router.put('/:id', requireAuth, updateRecipe);
router.delete('/:id', requireAuth, deleteRecipe);

export default router;