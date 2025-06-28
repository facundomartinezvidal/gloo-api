import express from 'express';
import { getAllRecipes, createRecipe } from '../handlers/recipes';
const router = express.Router();

router.get('/', getAllRecipes);
router.post('/:userId', createRecipe);


export default router;