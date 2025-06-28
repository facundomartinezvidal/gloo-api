import { z } from 'zod';

export const createCollectionInput = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  isPublic: z.string().optional().default('false'),
});

export const updateCollectionInput = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100, 'El nombre no puede exceder 100 caracteres').optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  isPublic: z.string().optional(),
});

export const addRecipeToCollectionInput = z.object({
  recipeId: z.number().int().positive('El ID de la receta debe ser un número positivo'),
});

export const removeRecipeFromCollectionInput = z.object({
  recipeId: z.number().int().positive('El ID de la receta debe ser un número positivo'),
});

export type CreateCollectionInput = z.infer<typeof createCollectionInput>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionInput>;
export type AddRecipeToCollectionInput = z.infer<typeof addRecipeToCollectionInput>;
export type RemoveRecipeFromCollectionInput = z.infer<typeof removeRecipeFromCollectionInput>; 