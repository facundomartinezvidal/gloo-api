import { z } from 'zod';

export const createCommentInput = z.object({
  recipeId: z.number().int().positive('Recipe ID must be a positive integer'),
  content: z.string().min(1, 'Comment content is required').max(1000, 'Comment is too long'),
});

export const updateCommentInput = z.object({
  content: z.string().min(1, 'Comment content is required').max(1000, 'Comment is too long'),
});

export const getCommentsInput = z.object({
  recipeId: z.number().int().positive('Recipe ID must be a positive integer'),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

export default {
  createCommentInput,
  updateCommentInput,
  getCommentsInput,
}; 