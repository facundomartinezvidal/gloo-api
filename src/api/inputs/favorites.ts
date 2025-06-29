import { z } from 'zod';

export const addToFavoritesInput = z.object({
  recipeId: z.number().int().positive('El ID de la receta debe ser un número positivo'),
});

export const removeFromFavoritesInput = z.object({
  recipeId: z.number().int().positive('El ID de la receta debe ser un número positivo'),
});

export const createCollectionFromFavoritesInput = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  isPublic: z.string().optional().default('false'),
  recipeIds: z.array(z.number().int().positive()).min(1, 'Debe seleccionar al menos una receta'),
});

export type AddToFavoritesInput = z.infer<typeof addToFavoritesInput>;
export type RemoveFromFavoritesInput = z.infer<typeof removeFromFavoritesInput>;
export type CreateCollectionFromFavoritesInput = z.infer<typeof createCollectionFromFavoritesInput>; 