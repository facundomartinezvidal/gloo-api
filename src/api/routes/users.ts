import express from 'express';
import { 
  getUser,
  updateUser,
} from '../handlers/users';

const router = express.Router();

// GET /:userId - Obtener datos completos del usuario
router.get('/:userId', getUser);

// PUT /:userId - Actualizar datos del usuario (tanto Clerk como tabla users)
router.put('/:userId', updateUser);

export default router; 