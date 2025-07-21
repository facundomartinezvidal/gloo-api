import express from 'express';
import multer from 'multer';
import { getAllRecipes, createRecipe, getRecipesByUser, updateRecipe, deleteRecipe, getTrendingRecipes, getRecipeById } from '../handlers/recipes';
import { requireAuthAndOwnership, requireAuth } from '../../middleware/clerkAuth';

const router = express.Router();

const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

router.get('/', getAllRecipes);
router.get('/trending', getTrendingRecipes);
router.get('/user/:userId', getRecipesByUser);
router.get('/:id', getRecipeById);
router.post('/:userId', requireAuthAndOwnership, upload.single('media'), createRecipe);
router.put('/:id', requireAuth, updateRecipe);
router.delete('/:id', requireAuth, deleteRecipe);

export default router;