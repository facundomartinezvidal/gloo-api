import express from 'express';
import { 
  followUser, 
  unfollowUser, 
  getFollowers, 
  getFollowing, 
  getFollowStatus, 
  getUserStats,
} from '../handlers/follows';
import { requireAuthAndOwnership } from '../../middleware/clerkAuth';

const router = express.Router();

// POST /:userId/follow - Seguir a un usuario
router.post('/:userId/follow', requireAuthAndOwnership, followUser);

// DELETE /:userId/unfollow - Dejar de seguir a un usuario
router.delete('/:userId/unfollow', requireAuthAndOwnership, unfollowUser);

// GET /:userId/followers - Obtener seguidores de un usuario
router.get('/:userId/followers', getFollowers);

// GET /:userId/following - Obtener usuarios que sigue un usuario
router.get('/:userId/following', getFollowing);

// GET /:userId/status - Obtener estado de seguimiento entre dos usuarios
// Query param: targetUserId
router.get('/:userId/status', getFollowStatus);

// GET /:userId/stats - Obtener estadísticas de seguimiento (contadores)
router.get('/:userId/stats', getUserStats);

export default router; 