import express from 'express';
import { 
  getUser,
  updateUser,
  getUserStats,
} from '../handlers/users';
import { requireAuthAndOwnership } from '../../middleware/clerkAuth';

const router = express.Router();

// GET /:userId - Obtener datos completos del usuario
router.get('/:userId', requireAuthAndOwnership, getUser);

// GET /:userId/stats - Obtener estadísticas del usuario
router.get('/:userId/stats', requireAuthAndOwnership, getUserStats);

// PUT /:userId - Actualizar datos del usuario (tanto Clerk como tabla users)
router.put('/:userId', requireAuthAndOwnership, updateUser);

export default router; 