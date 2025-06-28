import { z } from 'zod';

export const getNotificationsInput = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(50).optional().default(20),
  type: z.enum(['follow', 'like', 'comment', 'recipe_approved']).optional(),
  read: z.boolean().optional(),
});

export const markAsReadInput = z.object({
  notificationIds: z.array(z.number().int().positive()).min(1, 'At least one notification ID is required'),
});

export const markAllAsReadInput = z.object({
  type: z.enum(['follow', 'like', 'comment', 'recipe_approved']).optional(),
});

export const createNotificationInput = z.object({
  recipientId: z.string().min(1, 'Recipient ID is required'),
  senderId: z.string().optional(),
  type: z.enum(['follow', 'like', 'comment', 'recipe_approved']),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  relatedId: z.number().int().optional(),
  relatedType: z.string().optional(),
});

export default {
  getNotificationsInput,
  markAsReadInput,
  markAllAsReadInput,
  createNotificationInput,
}; 