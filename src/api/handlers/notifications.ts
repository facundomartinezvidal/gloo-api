import { Request, Response } from 'express';
import { db } from '../../db';
import { notification, users } from '../../db/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';
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
    const { notificationIds } = markAsReadInput.parse(req.body);

    // Marcar notificaciones como leídas solo si pertenecen al usuario
    const updatedNotifications = await db.update(notification)
      .set({ read: 'true' })
      .where(and(
        eq(notification.recipientId, userId),
        sql`${notification.id} = ANY(${notificationIds})`,
      ))
      .returning();

    res.json({
      success: true,
      data: {
        updatedCount: updatedNotifications.length,
        notifications: updatedNotifications,
      },
      message: 'Notifications marked as read',
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
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