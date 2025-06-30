import { Request, Response } from 'express';
import { db } from '../../db';
import { instruction } from '../../db/schema';
import createInstructionsInput from '../inputs/instructions';
import { supabase } from '../lib/supabase';
import { eq } from 'drizzle-orm';

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
          // If image comes as base64, upload to Supabase Storage
          if (inst.image.startsWith('data:')) {
            try {
              // Extract file type and base64 data
              const [header, base64Data] = inst.image.split(',');
              if (!header || !base64Data) {
                throw new Error('Formato de imagen base64 inválido');
              }
              
              const mimeMatch = header.match(/data:([^;]+)/);
              const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
              
              // Validate that it's an image (only images for instructions)
              if (!mimeType.startsWith('image/')) {
                throw new Error('Solo se permiten archivos de imagen para instrucciones');
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
                  upsert: false,
                });

              if (uploadError) {
                console.error('Storage upload error:', uploadError);
                throw new Error(`Error al subir imagen: ${uploadError.message}`);
              }

              // Get public URL of the file
              const { data: urlData } = supabase.storage
                .from('recipe.content')
                .getPublicUrl(fileName);

              if (!urlData?.publicUrl) {
                throw new Error('No se pudo obtener la URL pública de la imagen');
              }

              imageUrl = urlData.publicUrl;
              
            } catch (uploadError) {
              console.error('Error processing image for instruction:', uploadError);
              // En caso de error, no guardar nada en lugar de null
              // Esto permitirá que el error se propague y no se guarde la instrucción
              throw uploadError;
            }
          } else {
            // Si no es base64, asumir que es una URL válida
            imageUrl = inst.image;
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
      message: `${newInstructions.length} instrucción(es) creada(s) exitosamente`,
    });
  } catch (error) {
    console.error('Error creating instructions:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor',
    });
  }
};

export const updateInstruction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { step, description, image } = req.body;
    
    const instructionId = parseInt(id);
    if (isNaN(instructionId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de instrucción inválido',
      });
    }

    // Verificar si la instrucción existe
    const existingInstruction = await db.select().from(instruction).where(eq(instruction.id, instructionId));
    if (existingInstruction.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Instrucción no encontrada',
      });
    }

    let imageUrl: string | null = existingInstruction[0].image;

    // Procesar imagen si se proporciona
    if (image !== undefined) {
      if (image === null || image === '') {
        // Si se envía null o string vacío, eliminar la imagen
        imageUrl = null;
      } else if (image.startsWith('data:')) {
        // Procesar imagen base64
        try {
          // Extraer tipo de archivo y datos base64
          const [header, base64Data] = image.split(',');
          if (!header || !base64Data) {
            throw new Error('Formato de imagen base64 inválido');
          }
          
          const mimeMatch = header.match(/data:([^;]+)/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          
          // Validar que sea una imagen
          if (!mimeType.startsWith('image/')) {
            return res.status(400).json({
              success: false,
              error: 'Solo se permiten archivos de imagen para instrucciones',
            });
          }
          
          // Convertir base64 a buffer
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Generar nombre único de archivo
          const extension = mimeType.split('/')[1];
          const fileName = `instructions/${existingInstruction[0].recipeId}/${Date.now()}-step-${step || existingInstruction[0].step}.${extension}`;
          
          // Subir archivo a Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('recipe.content')
            .upload(fileName, buffer, {
              contentType: mimeType,
              upsert: false,
            });

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            return res.status(400).json({
              success: false,
              error: 'Error al subir imagen: ' + uploadError.message,
            });
          }

          // Obtener URL pública del archivo
          const { data: urlData } = supabase.storage
            .from('recipe.content')
            .getPublicUrl(fileName);

          if (!urlData?.publicUrl) {
            return res.status(400).json({
              success: false,
              error: 'No se pudo obtener la URL pública de la imagen',
            });
          }

          imageUrl = urlData.publicUrl;
          
        } catch (uploadError) {
          console.error('Error processing image:', uploadError);
          return res.status(400).json({
            success: false,
            error: 'Error al procesar la imagen',
          });
        }
      } else {
        // Si no es base64, asumir que es una URL válida
        imageUrl = image;
      }
    }

    // Actualizar la instrucción
    const updatedInstruction = await db
      .update(instruction)
      .set({
        step: step !== undefined ? step : existingInstruction[0].step,
        description: description !== undefined ? description : existingInstruction[0].description,
        image: imageUrl,
        updatedAt: new Date(),
      })
      .where(eq(instruction.id, instructionId))
      .returning();

    res.json({
      success: true,
      data: updatedInstruction[0],
      message: 'Instrucción actualizada exitosamente',
    });
  } catch (error) {
    console.error('Error updating instruction:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

export const deleteInstruction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const instructionId = parseInt(id);
    if (isNaN(instructionId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de instrucción inválido',
      });
    }

    // Verificar si la instrucción existe
    const existingInstruction = await db.select().from(instruction).where(eq(instruction.id, instructionId));
    if (existingInstruction.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Instrucción no encontrada',
      });
    }

    // Eliminar la instrucción
    await db.delete(instruction).where(eq(instruction.id, instructionId));

    res.json({
      success: true,
      message: 'Instrucción eliminada exitosamente',
    });
  } catch (error) {
    console.error('Error deleting instruction:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
}; 