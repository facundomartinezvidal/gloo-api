import express from 'express';
import { 
  getUser,
  updateUser,
  getUserStats,
} from '../handlers/users';

const router = express.Router();

// GET /:userId - Obtener datos completos del usuario
router.get('/:userId', getUser);

// GET /:userId/stats - Obtener estadísticas del usuario
router.get('/:userId/stats', getUserStats);

// PUT /:userId - Actualizar datos del usuario (tanto Clerk como tabla users)
router.put('/:userId', updateUser);

export default router; 