import express from 'express';
import { createInstruction } from '../handlers/instructions';

const router = express.Router();

router.post('/:recipeId', createInstruction);

export default router; 