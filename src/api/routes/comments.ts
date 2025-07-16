import express from 'express';
import { 
  createComment, 
  getComments, 
  updateComment, 
  deleteComment,
} from '../handlers/comments';
import { requireAuthAndOwnership } from '../../middleware/clerkAuth';

const router = express.Router();

// POST /:userId - Crear un comentario en una receta
router.post('/:userId', requireAuthAndOwnership, createComment);

// GET /recipe/:recipeId - Obtener comentarios de una receta
router.get('/recipe/:recipeId', getComments);

// PUT /:userId/:commentId - Actualizar un comentario
router.put('/:userId/:commentId', requireAuthAndOwnership, updateComment);

// DELETE /:userId/:commentId - Eliminar un comentario
router.delete('/:userId/:commentId', requireAuthAndOwnership, deleteComment);

export default router; 