import express from 'express';
import { createIngredient, updateIngredient, deleteIngredient } from '../handlers/ingredients';

const router = express.Router();

router.post('/:recipeId', createIngredient);
router.put('/:id', updateIngredient);
router.delete('/:id', deleteIngredient);

export default router;