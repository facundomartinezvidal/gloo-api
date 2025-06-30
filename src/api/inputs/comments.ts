import { z } from 'zod';

export const createCommentInput = z.object({
  recipeId: z.number().int().positive('Recipe ID must be a positive integer'),
  content: z.string().min(1, 'Comment content is required').max(1000, 'Comment is too long'),
});

export const updateCommentInput = z.object({
  content: z.string().min(1, 'Comment content is required').max(1000, 'Comment is too long'),
});

export default {
  createCommentInput,
  updateCommentInput,
}; 