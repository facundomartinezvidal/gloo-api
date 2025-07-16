import express from 'express';
import { 
  getPendingRecipes,
  approveRecipe,
  rejectRecipe,
  getApprovalStats,
  getRecipesReviewedByAdmin,
  getAdminPersonalStats,
} from '../handlers/recipeApproval';
import { checkUserRole, requireAdmin } from '../../middleware/roleCheck';
import { requireAuth } from '../../middleware/clerkAuth';

const router = express.Router();

// Aplicar middleware de autenticación JWT y verificación de rol a todas las rutas
router.use('/:userId', requireAuth, checkUserRole);

// GET /:userId/pending - Obtener recetas pendientes de aprobación (solo admins)
router.get('/:userId/pending', requireAdmin, getPendingRecipes);

// POST /:userId/approve/:recipeId - Aprobar una receta (solo admins)
router.post('/:userId/approve/:recipeId', requireAdmin, approveRecipe);

// POST /:userId/reject/:recipeId - Rechazar una receta (solo admins)
router.post('/:userId/reject/:recipeId', requireAdmin, rejectRecipe);

// GET /:userId/stats - Obtener estadísticas de aprobación (solo admins)
router.get('/:userId/stats', requireAdmin, getApprovalStats);

// GET /:userId/my-reviews - Obtener recetas revisadas por el admin
router.get('/:userId/my-reviews', requireAdmin, getRecipesReviewedByAdmin);

// GET /:userId/my-stats - Obtener estadísticas personales del admin
router.get('/:userId/my-stats', requireAdmin, getAdminPersonalStats);

export default router; 