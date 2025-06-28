import { z } from 'zod';

export const likeRecipeInput = z.object({
  recipeId: z.number().int().positive('Recipe ID must be a positive integer'),
});

export const unlikeRecipeInput = z.object({
  recipeId: z.number().int().positive('Recipe ID must be a positive integer'),
});

export const getRecipeLikesInput = z.object({
  recipeId: z.number().int().positive('Recipe ID must be a positive integer'),
});

export default {
  likeRecipeInput,
  unlikeRecipeInput,
  getRecipeLikesInput,
}; 