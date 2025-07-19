import { z } from 'zod';

export const searchRecipesInput = z.object({
  query: z.string().min(1, 'La consulta no puede estar vacía').max(100, 'La consulta es demasiado larga'),
  categoryId: z.number().int().positive().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(50).default(20),
  sortBy: z.enum(['relevance', 'newest', 'rating', 'popularity']).default('relevance'),
  maxDuration: z.number().int().positive().optional(),
  excludeIngredients: z.string().optional(),
});

export const addToHistoryInput = z.object({
  query: z.string().min(1, 'La consulta no puede estar vacía').max(100, 'La consulta es demasiado larga'),
  resultsCount: z.number().int().nonnegative().default(0),
});

export const createCategoryInput = z.object({
  name: z.string().min(1, 'El nombre no puede estar vacío').max(50, 'El nombre es demasiado largo'),
  displayName: z.string().min(1, 'El nombre de visualización no puede estar vacío').max(100, 'El nombre de visualización es demasiado largo'),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export const updateSuggestionInput = z.object({
  query: z.string().min(1, 'La consulta no puede estar vacía').max(100, 'La consulta es demasiado larga'),
});

export default {
  searchRecipesInput,
  addToHistoryInput,
  createCategoryInput,
  updateSuggestionInput,
}; 