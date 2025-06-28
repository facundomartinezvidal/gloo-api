import { z } from 'zod';

const instructionSchema = z.object({
  step: z.number().min(1, 'Step number must be greater than 0'),
  description: z.string().min(1, 'Description is required'),
  image: z.string().min(1).optional(), // Optional image for each instruction
});

const createInstructionsInput = z.object({
  instructions: z.array(instructionSchema).min(1, 'At least one instruction is required'),
});

export default createInstructionsInput;
export type CreateInstructionsInput = z.infer<typeof createInstructionsInput>;
export type InstructionInput = z.infer<typeof instructionSchema>; 