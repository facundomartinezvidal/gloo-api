import { z } from 'zod';

const ingredientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  quantity: z.number().min(0.1, 'Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required'),
  description: z.string().optional(),
});

const createIngredientsInput = z.object({
  ingredients: z.array(ingredientSchema).min(1, 'At least one ingredient is required'),
});

export default createIngredientsInput;
export type CreateIngredientsInput = z.infer<typeof createIngredientsInput>;
export type IngredientInput = z.infer<typeof ingredientSchema>; 