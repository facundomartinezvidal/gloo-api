import express from 'express';
// import multer from 'multer';
import { getAllRecipes, createRecipe, getRecipesByUser, updateRecipe, deleteRecipe, getTrendingRecipes, getRecipeById } from '../handlers/recipes';
import { requireAuthAndOwnership, requireAuth } from '../../middleware/clerkAuth';

const router = express.Router();

// Eliminar configuración de multer
// const upload = multer({
//   storage: multer.diskStorage({}),
//   limits: { fileSize: 50 * 1024 * 1024 },
// });

router.get('/', getAllRecipes);
router.get('/trending', getTrendingRecipes);
router.get('/user/:userId', getRecipesByUser);
router.get('/:id', getRecipeById);
// Eliminar multer de la ruta POST
router.post('/:userId', requireAuthAndOwnership, createRecipe);
router.put('/:id', requireAuth, updateRecipe);
router.delete('/:id', requireAuth, deleteRecipe);

export default router;