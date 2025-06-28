import { Request, Response } from 'express';
import { db } from '../../db';
import { instruction } from '../../db/schema';
import createInstructionsInput from '../inputs/instructions';
import { supabase } from '../lib/supabase';

export const createInstruction = async (req: Request, res: Response) => {
  try {
    const { instructions } = createInstructionsInput.parse(req.body);
    const recipeId = parseInt(req.params.recipeId);

    // Validate that recipeId is a valid number
    if (isNaN(recipeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipe ID',
      });
    }

    // Process each instruction and handle image uploads
    const processedInstructions = await Promise.all(
      instructions.map(async (inst) => {
        let imageUrl: string | null = null;

        // Only process image if provided
        if (inst.image) {
          imageUrl = inst.image; // Default to use provided URL

          // If image comes as base64, upload to Supabase Storage
          if (inst.image.startsWith('data:')) {
            // Extract file type and base64 data
            const [header, base64Data] = inst.image.split(',');
            const mimeMatch = header.match(/data:([^;]+)/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            
            // Validate that it's an image (only images for instructions)
            if (!mimeType.startsWith('image/')) {
              throw new Error('Only image files are allowed for instructions');
            }
            
            // Convert base64 to buffer
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Generate unique filename
            const extension = mimeType.split('/')[1];
            const fileName = `instructions/${recipeId}/${Date.now()}-step-${inst.step}.${extension}`;
            
            // Upload file to Supabase Storage
            const { error: uploadError } = await supabase.storage
              .from('recipe.content')
              .upload(fileName, buffer, {
                contentType: mimeType,
              });

            if (uploadError) {
              throw new Error('Error uploading image: ' + uploadError.message);
            }

            // Get public URL of the file
            const { data: urlData } = supabase.storage
              .from('recipe.content')
              .getPublicUrl(fileName);

            imageUrl = urlData.publicUrl;
          }
        }

        return {
          recipeId,
          step: inst.step,
          description: inst.description,
          image: imageUrl,
        };
      }),
    );

    // Insert all instructions
    const newInstructions = await db
      .insert(instruction)
      .values(processedInstructions)
      .returning();

    res.json({
      success: true,
      data: newInstructions,
      message: `${newInstructions.length} instruction(s) created successfully`,
    });
  } catch (error) {
    console.error('Error creating instructions:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}; 