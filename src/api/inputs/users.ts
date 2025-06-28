import { z } from 'zod';

export const updateUserInput = z.object({
  // Datos de Clerk (opcionales)
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  
  // Datos de la tabla users (opcionales)
  description: z.string().optional(),
  idSocialMedia: z.string().optional(),
});

export const getUserInput = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export default {
  updateUserInput,
  getUserInput,
}; 