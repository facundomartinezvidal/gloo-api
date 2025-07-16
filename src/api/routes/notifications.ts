import express from 'express';
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  createNotification, 
  deleteNotification, 
  getUnreadCount,
} from '../handlers/notifications';
import { requireAuthAndOwnership, requireAuth } from '../../middleware/clerkAuth';

const router = express.Router();

// GET /:userId - Obtener notificaciones del usuario
router.get('/:userId', requireAuthAndOwnership, getNotifications);

// PUT /:userId/read - Marcar notificaciones específicas como leídas
router.put('/:userId/read', requireAuthAndOwnership, markAsRead);

// PUT /:userId/read-all - Marcar todas las notificaciones como leídas
router.put('/:userId/read-all', requireAuthAndOwnership, markAllAsRead);

// POST / - Crear una notificación (para uso interno/admin)
router.post('/', requireAuth, createNotification);

// DELETE /:userId/:notificationId - Eliminar una notificación
router.delete('/:userId/:notificationId', requireAuthAndOwnership, deleteNotification);

// GET /:userId/unread-count - Obtener contador de notificaciones no leídas
router.get('/:userId/unread-count', requireAuthAndOwnership, getUnreadCount);

export default router; 