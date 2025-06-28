import express from 'express';
import { getAllRecipes, createRecipe, getRecipesByUser } from '../handlers/recipes';
const router = express.Router();

router.get('/', getAllRecipes);
router.get('/user/:userId', getRecipesByUser);
router.post('/:userId', createRecipe);

export default router;