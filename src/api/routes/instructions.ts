import express from 'express';
import { createInstruction, updateInstruction, deleteInstruction } from '../handlers/instructions';

const router = express.Router();

router.post('/:recipeId', createInstruction);
router.put('/:id', updateInstruction);
router.delete('/:id', deleteInstruction);

export default router; 