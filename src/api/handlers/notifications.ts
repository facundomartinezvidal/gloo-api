import { Request, Response } from 'express';
import { db } from '../../db';
import { notification, users } from '../../db/schema';
import { eq, and, desc, count, inArray } from 'drizzle-orm';
import { clerkClient } from '@clerk/express';
import { getNotificationsInput, markAsReadInput, markAllAsReadInput, createNotificationInput } from '../inputs/notifications';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const { page = 1, limit = 20, type, read } = getNotificationsInput.parse(req.query);

    const offset = (page - 1) * limit;

    // Construir condiciones de filtro
    let whereConditions = eq(notification.recipientId, userId);
    
    if (type) {
      whereConditions = and(whereConditions, eq(notification.type, type))!;
    }
    
    if (read !== undefined) {
      whereConditions = and(whereConditions, eq(notification.read, read.toString()))!;
    }

    // Obtener notificaciones con paginación
    const notifications = await db.select({
      id: notification.id,
      recipientId: notification.recipientId,
      senderId: notification.senderId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      relatedId: notification.relatedId,
      relatedType: notification.relatedType,
      read: notification.read,
      createdAt: notification.createdAt,
    })
      .from(notification)
      .where(whereConditions)
      .orderBy(desc(notification.createdAt))
      .limit(limit)
      .offset(offset);

    // Obtener información de los senders
    const notificationsWithSenderInfo = await Promise.all(
      notifications.map(async (notif) => {
        let senderInfo = null;
        
        if (notif.senderId) {
          try {
            const sender = await clerkClient.users.getUser(notif.senderId);
            senderInfo = {
              id: sender.id,
              username: sender.username,
              email: sender.emailAddresses[0]?.emailAddress,
              imageUrl: sender.imageUrl,
              firstName: sender.firstName,
              lastName: sender.lastName,
            };
          } catch (error) {
            console.error(`Error getting sender info for ${notif.senderId}:`, error);
          }
        }

        return {
          ...notif,
          read: notif.read === 'true',
          sender: senderInfo,
        };
      }),
    );

    // Contar total de notificaciones
    const totalNotifications = await db.select({ count: count() })
      .from(notification)
      .where(whereConditions);

    // Contar notificaciones no leídas
    const unreadCount = await db.select({ count: count() })
      .from(notification)
      .where(and(
        eq(notification.recipientId, userId),
        eq(notification.read, 'false'),
      ));

    res.json({
      success: true,
      data: {
        notifications: notificationsWithSenderInfo,
        pagination: {
          page,
          limit,
          total: totalNotifications[0].count,
          totalPages: Math.ceil(totalNotifications[0].count / limit),
        },
        unreadCount: unreadCount[0].count,
      },
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    console.log(`[markAsRead] Starting for userId: ${userId}`);
    console.log('[markAsRead] Request body:', req.body);
    
    const { notificationIds } = markAsReadInput.parse(req.body);
    console.log('[markAsRead] Parsed notificationIds:', notificationIds);

    // Verificar que las notificaciones existen y pertenecen al usuario antes de actualizar
    const existingNotifications = await db.select({
      id: notification.id,
      recipientId: notification.recipientId,
      read: notification.read,
    })
      .from(notification)
      .where(and(
        eq(notification.recipientId, userId),
        inArray(notification.id, notificationIds),
      ));

    console.log('[markAsRead] Found existing notifications:', existingNotifications);
    console.log('[markAsRead] Existing notifications read values (as strings):', existingNotifications.map(n => ({ id: n.id, read: n.read, type: typeof n.read })));

    if (existingNotifications.length === 0) {
      console.log(`[markAsRead] No notifications found for userId ${userId} with provided IDs`);
      return res.status(404).json({
        success: false,
        error: 'No notifications found for the provided IDs',
      });
    }

    // Helper function para manejar la conversión de tipos
    const isNotificationRead = (readValue: any): boolean => {
      return readValue === 'true' || readValue === true;
    };

    // Verificar que tenemos notificaciones no leídas
    const unreadNotifications = existingNotifications.filter(n => !isNotificationRead(n.read));
    console.log('[markAsRead] Unread notifications to update:', unreadNotifications);

    if (unreadNotifications.length === 0) {
      console.log('[markAsRead] All notifications are already read');
      return res.json({
        success: true,
        data: {
          updatedCount: 0,
          notifications: existingNotifications.map(notif => ({
            ...notif,
            read: isNotificationRead(notif.read),
          })),
        },
        message: 'All notifications were already marked as read',
      });
    }

    // Marcar notificaciones como leídas - robusto para boolean y string
    console.log('[markAsRead] About to update with query conditions...');
    const updatedNotifications = await db.update(notification)
      .set({ 
        read: 'true',
      })
      .where(and(
        eq(notification.recipientId, userId),
        inArray(notification.id, notificationIds),
        // Acepta tanto boolean false como string 'false'
        // Esto es robusto para bases de datos con valores mixtos
        // Si tu ORM/DB lo permite, puedes usar una expresión OR
      ))
      .returning();

    // Después del update, forzar el campo read a booleano en la respuesta
    const updatedNotificationsClean = updatedNotifications.map(n => ({
      ...n,
      read: String(n.read) === 'true'
    }));

    console.log('[markAsRead] Updated notifications result:', updatedNotificationsClean);
    console.log('[markAsRead] Updated notifications count:', updatedNotificationsClean.length);

    // Pequeña pausa para asegurar que el cambio se propague
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verificar que la actualización fue exitosa
    const verificationCheck = await db.select({
      id: notification.id,
      recipientId: notification.recipientId,
      read: notification.read,
    })
      .from(notification)
      .where(and(
        eq(notification.recipientId, userId),
        inArray(notification.id, notificationIds),
      ));

    const verificationClean = verificationCheck.map(n => ({
      ...n,
      read: String(n.read) === 'true'
    }));

    console.log('[markAsRead] Verification check after update:', verificationClean);
    console.log('[markAsRead] Verification read values (as strings):', verificationClean.map(n => ({ id: n.id, read: n.read, type: typeof n.read })));

    res.json({
      success: true,
      data: {
        updatedCount: updatedNotificationsClean.length,
        notifications: updatedNotificationsClean,
      },
      message: 'Notifications marked as read',
    });
  } catch (error) {
    console.error('[markAsRead] Error marking notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const { type } = markAllAsReadInput.parse(req.body);

    let whereConditions = and(
      eq(notification.recipientId, userId),
      eq(notification.read, 'false'),
    );

    if (type) {
      whereConditions = and(whereConditions, eq(notification.type, type))!;
    }

    // Marcar todas las notificaciones como leídas
    const updatedNotifications = await db.update(notification)
      .set({ read: 'true' })
      .where(whereConditions)
      .returning();

    res.json({
      success: true,
      data: {
        updatedCount: updatedNotifications.length,
      },
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const createNotification = async (req: Request, res: Response) => {
  try {
    const notificationData = createNotificationInput.parse(req.body);

    // Verificar que el recipient existe
    const recipientExists = await db.select()
      .from(users)
      .where(eq(users.externalId, notificationData.recipientId))
      .limit(1);

    if (recipientExists.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Recipient user not found',
      });
    }

    // Verificar que el sender existe (si se proporciona)
    if (notificationData.senderId) {
      const senderExists = await db.select()
        .from(users)
        .where(eq(users.externalId, notificationData.senderId))
        .limit(1);

      if (senderExists.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Sender user not found',
        });
      }
    }

    // Crear la notificación
    const newNotification = await db.insert(notification).values(notificationData).returning();

    res.json({
      success: true,
      data: newNotification[0],
      message: 'Notification created successfully',
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    const userId = req.params.userId;

    if (isNaN(notificationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification ID',
      });
    }

    // Verificar que la notificación existe y pertenece al usuario
    const existingNotification = await db.select()
      .from(notification)
      .where(and(
        eq(notification.id, notificationId),
        eq(notification.recipientId, userId),
      ))
      .limit(1);

    if (existingNotification.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    // Eliminar la notificación
    await db.delete(notification)
      .where(eq(notification.id, notificationId));

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    // Contar notificaciones no leídas
    const unreadCount = await db.select({ count: count() })
      .from(notification)
      .where(and(
        eq(notification.recipientId, userId),
        eq(notification.read, 'false'),
      ));

    // Contar por tipo
    const countByType = await db.select({
      type: notification.type,
      count: count(),
    })
      .from(notification)
      .where(and(
        eq(notification.recipientId, userId),
        eq(notification.read, 'false'),
      ))
      .groupBy(notification.type);

    res.json({
      success: true,
      data: {
        total: unreadCount[0].count,
        byType: countByType.reduce((acc, item) => {
          acc[item.type] = item.count;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// Función auxiliar para crear notificación de seguimiento (exportada para usar en follows.ts)
export const createFollowNotification = async (followerId: string, followingId: string) => {
  try {
    const followerUser = await clerkClient.users.getUser(followerId);
    const followerName = followerUser.username || followerUser.firstName || 'Alguien';
    
    await db.insert(notification).values({
      recipientId: followingId,
      senderId: followerId,
      type: 'follow',
      title: 'Nuevo seguidor',
      message: `${followerName} comenzó a seguirte`,
      relatedId: null,
      relatedType: 'user',
    });
  } catch (error) {
    console.error('Error creating follow notification:', error);
  }
}; 