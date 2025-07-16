import { z } from 'zod';

export const approveRecipeInput = z.object({
  comment: z.string().optional(),
});

export const rejectRecipeInput = z.object({
  comment: z.string().min(1, 'El comentario es requerido para rechazar una receta'),
});

export const getPendingRecipesInput = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

export const getReviewedRecipesInput = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(50).optional().default(20),
  status: z.enum(['approved', 'rejected']).optional(),
}); 