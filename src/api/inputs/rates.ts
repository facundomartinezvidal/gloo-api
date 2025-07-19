import { z } from 'zod';

export const rateRecipeInput = z.object({
  recipeId: z.number().int().positive('Recipe ID must be a positive integer'),
  rate: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
});

export const updateRateInput = z.object({
  recipeId: z.number().int().positive('Recipe ID must be a positive integer'),
  rate: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
});

export const deleteRateInput = z.object({
  recipeId: z.number().int().positive('Recipe ID must be a positive integer'),
});

export default {
  rateRecipeInput,
  updateRateInput,
  deleteRateInput,
}; 