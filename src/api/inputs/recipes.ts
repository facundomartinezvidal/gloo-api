import { z } from 'zod';

const createRecipeInput = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  estimatedTime: z.number().min(1, 'Estimated time is required'),
  media: z.string().min(1).optional(), // Puede ser imagen o video
});

export default createRecipeInput;

export type CreateRecipeInput = z.infer<typeof createRecipeInput>;    