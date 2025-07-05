import express from 'express';
import { getAllRecipes, createRecipe, getRecipesByUser, updateRecipe, deleteRecipe, getTrendingRecipes, getRecipesFromFollowing } from '../handlers/recipes';
const router = express.Router();

router.get('/', getAllRecipes);
router.get('/trending', getTrendingRecipes);
router.get('/following/:userId', getRecipesFromFollowing);
router.get('/user/:userId', getRecipesByUser);
router.post('/:userId', createRecipe);
router.put('/:id', updateRecipe);
router.delete('/:id', deleteRecipe);

export default router;