import express from 'express';
import { createIngredient } from '../handlers/ingredients';

const router = express.Router();

router.post('/:recipeId', createIngredient);

export default router;