import express from 'express';
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  createNotification, 
  deleteNotification, 
  getUnreadCount 
} from '../handlers/notifications';

const router = express.Router();

// GET /:userId - Obtener notificaciones del usuario
router.get('/:userId', getNotifications);

// PUT /:userId/read - Marcar notificaciones específicas como leídas
router.put('/:userId/read', markAsRead);

// PUT /:userId/read-all - Marcar todas las notificaciones como leídas
router.put('/:userId/read-all', markAllAsRead);

// POST / - Crear una notificación (para uso interno/admin)
router.post('/', createNotification);

// DELETE /:userId/:notificationId - Eliminar una notificación
router.delete('/:userId/:notificationId', deleteNotification);

// GET /:userId/unread-count - Obtener contador de notificaciones no leídas
router.get('/:userId/unread-count', getUnreadCount);

export default router; 