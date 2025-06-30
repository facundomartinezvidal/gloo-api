import { Request, Response } from 'express';
import { db } from '../../db';
import { ingredient, instruction, rate, recipe } from '../../db/schema';
import { count, eq, asc } from 'drizzle-orm';
import { clerkClient } from '@clerk/express';
import createRecipeInput from '../inputs/recipes';
import { supabase } from '../lib/supabase';

export const getAllRecipes = async (req: Request, res: Response) => {
  const recipes = await db.select().from(recipe);
  const data = await Promise.all(recipes.map(async (r) => {
    const rates = await db.select({ count: count() }).from(rate).where(eq(rate.recipeId, r.id));
    const ingredients = await db.select().from(ingredient).where(eq(ingredient.recipeId, r.id));
    const instructions = await db.select().from(instruction).where(eq(instruction.recipeId, r.id));
    const user = await clerkClient.users.getUser(r.userId as string);
    return {
      ...r,
      user: {
        id: user.id,
        username: user.username,
        email: user.emailAddresses[0].emailAddress, 
        imageUrl: user.imageUrl,
      },
      rates: rates[0].count,
      ingredients: ingredients,
      instructions: instructions,
    };
  }));
  res.json({
    success: true,
    data,
  });
};

export const getRecipesByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Obtener todas las recetas del usuario específico
    const recipes = await db.select().from(recipe).where(eq(recipe.userId, userId));
    
    // Mapear cada receta con sus datos completos
    const data = await Promise.all(recipes.map(async (r) => {
      const rates = await db.select({ count: count() }).from(rate).where(eq(rate.recipeId, r.id));
      const ingredients = await db.select().from(ingredient).where(eq(ingredient.recipeId, r.id));
      const instructions = await db.select().from(instruction).where(eq(instruction.recipeId, r.id));
      const user = await clerkClient.users.getUser(r.userId as string);
      return {
        ...r,
        user: {
          id: user.id,
          username: user.username,
          email: user.emailAddresses[0].emailAddress, 
          imageUrl: user.imageUrl,
        },
        rates: rates[0].count,
        ingredients: ingredients,
        instructions: instructions,
      };
    }));
    
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error getting user recipes:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

export const createRecipe = async (req: Request, res: Response) => {
  try {
    const { title, description, estimatedTime, media, ingredients, instructions, servings } = req.body;
    const userId = req.params.userId;
    
    console.log('🔧 Creating recipe with data:', { title, description, estimatedTime, ingredientsCount: ingredients?.length, instructionsCount: instructions?.length });
    
    let mediaUrl: string | null = null;
    let mediaType: 'image' | 'video' | null = null;

    // Only process media if provided
    if (media) {
      mediaUrl = media; // Default to use provided URL

      // If file comes as base64, upload to Supabase Storage
      if (media.startsWith('data:')) {
        // Extract file type and base64 data
        const [header, base64Data] = media.split(',');
        const mimeMatch = header.match(/data:([^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        
        // Validate that it's image or video
        if (!mimeType.startsWith('image/') && !mimeType.startsWith('video/')) {
          return res.status(400).json({
            success: false,
            error: 'Only image or video files are allowed',
          });
        }
        
        // Determine media type
        mediaType = mimeType.startsWith('image/') ? 'image' : 'video';
        
        // Convert base64 to buffer
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate unique filename
        const extension = mimeType.split('/')[1];
        const fileName = `recipes/${userId}/${Date.now()}.${extension}`;
        
        // Upload file to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('recipe.content')
          .upload(fileName, buffer, {
            contentType: mimeType,
          });

        if (uploadError) {
          return res.status(400).json({
            success: false,
            error: 'Error uploading file: ' + uploadError.message,
          });
        }

        // Get public URL of the file
        const { data: urlData } = supabase.storage
          .from('recipe.content')
          .getPublicUrl(fileName);

        mediaUrl = urlData.publicUrl;
      } else {
        // If it's a URL, try to determine type by extension
        const urlLower = media.toLowerCase();
        if (urlLower.includes('.mp4') || urlLower.includes('.webm') || urlLower.includes('.mov')) {
          mediaType = 'video';
        } else {
          mediaType = 'image'; // Default to assume image
        }
      }
    }

    // Create the recipe first
    const newRecipe = await db.insert(recipe).values({
      title,
      description,
      estimatedTime,
      userId,
      image: mediaUrl,
      mediaType: mediaType,
      servings: servings || 4,
    }).returning();

    console.log('🔧 Recipe created with ID:', newRecipe[0].id);

    // Add ingredients if provided
    if (ingredients && Array.isArray(ingredients) && ingredients.length > 0) {
      const ingredientsToInsert = ingredients.map(ing => ({
        recipeId: newRecipe[0].id,
        name: ing.name,
        quantity: ing.quantity || 1,
        unit: ing.unit || '',
        description: ing.description || null,
      }));

      await db.insert(ingredient).values(ingredientsToInsert);
      console.log('🔧 Added', ingredientsToInsert.length, 'ingredients');
    }

    // Add instructions if provided
    if (instructions && Array.isArray(instructions) && instructions.length > 0) {
      const instructionsToInsert = instructions.map((inst, index) => ({
        recipeId: newRecipe[0].id,
        step: index + 1,
        description: inst.description || inst.step || '',
        image: inst.image || null,
      }));

      await db.insert(instruction).values(instructionsToInsert);
      console.log('🔧 Added', instructionsToInsert.length, 'instructions');
    }

    // Get the complete recipe with ingredients and instructions
    const [recipeIngredients, recipeInstructions] = await Promise.all([
      db.select().from(ingredient).where(eq(ingredient.recipeId, newRecipe[0].id)),
      db.select().from(instruction).where(eq(instruction.recipeId, newRecipe[0].id)).orderBy(asc(instruction.step)),
    ]);

    const completeRecipe = {
      ...newRecipe[0],
      ingredients: recipeIngredients,
      instructions: recipeInstructions,
    };

    console.log('🔧 Recipe creation completed successfully');

    res.json({
      success: true,
      data: completeRecipe,
    });
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const updateRecipe = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, estimatedTime, media } = createRecipeInput.parse(req.body);
    
    const recipeId = parseInt(id);
    if (isNaN(recipeId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de receta inválido',
      });
    }

    // Verificar si la receta existe
    const existingRecipe = await db.select().from(recipe).where(eq(recipe.id, recipeId));
    if (existingRecipe.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Receta no encontrada',
      });
    }

    let mediaUrl: string | null = null;
    let mediaType: 'image' | 'video' | null = null;

    // Procesar media si se proporciona
    if (media) {
      mediaUrl = media; // Por defecto usar la URL proporcionada

      // Si el archivo viene como base64, subirlo a Supabase Storage
      if (media.startsWith('data:')) {
        // Extraer tipo de archivo y datos base64
        const [header, base64Data] = media.split(',');
        const mimeMatch = header.match(/data:([^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        
        // Validar que sea imagen o video
        if (!mimeType.startsWith('image/') && !mimeType.startsWith('video/')) {
          return res.status(400).json({
            success: false,
            error: 'Solo se permiten archivos de imagen o video',
          });
        }
        
        // Determinar tipo de media
        mediaType = mimeType.startsWith('image/') ? 'image' : 'video';
        
        // Convertir base64 a buffer
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generar nombre único de archivo
        const extension = mimeType.split('/')[1];
        const fileName = `recipes/${existingRecipe[0].userId}/${Date.now()}.${extension}`;
        
        // Subir archivo a Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('recipe.content')
          .upload(fileName, buffer, {
            contentType: mimeType,
          });

        if (uploadError) {
          return res.status(400).json({
            success: false,
            error: 'Error al subir archivo: ' + uploadError.message,
          });
        }

        // Obtener URL pública del archivo
        const { data: urlData } = supabase.storage
          .from('recipe.content')
          .getPublicUrl(fileName);

        mediaUrl = urlData.publicUrl;
      } else {
        // Si es una URL, intentar determinar el tipo por extensión
        const urlLower = media.toLowerCase();
        if (urlLower.includes('.mp4') || urlLower.includes('.webm') || urlLower.includes('.mov')) {
          mediaType = 'video';
        } else {
          mediaType = 'image'; // Por defecto asumir imagen
        }
      }
    }

    // Actualizar la receta
    const updatedRecipe = await db
      .update(recipe)
      .set({
        title,
        description,
        estimatedTime,
        image: mediaUrl,
        mediaType: mediaType,
        updatedAt: new Date(),
      })
      .where(eq(recipe.id, recipeId))
      .returning();

    res.json({
      success: true,
      data: updatedRecipe[0],
      message: 'Receta actualizada exitosamente',
    });
  } catch (error) {
    console.error('Error updating recipe:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

export const deleteRecipe = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const recipeId = parseInt(id);
    if (isNaN(recipeId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de receta inválido',
      });
    }

    // Verificar si la receta existe
    const existingRecipe = await db.select().from(recipe).where(eq(recipe.id, recipeId));
    if (existingRecipe.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Receta no encontrada',
      });
    }

    // Eliminar ingredientes asociados
    await db.delete(ingredient).where(eq(ingredient.recipeId, recipeId));
    
    // Eliminar instrucciones asociadas
    await db.delete(instruction).where(eq(instruction.recipeId, recipeId));
    
    // Eliminar calificaciones asociadas
    await db.delete(rate).where(eq(rate.recipeId, recipeId));
    
    // Eliminar la receta
    await db.delete(recipe).where(eq(recipe.id, recipeId));

    res.json({
      success: true,
      message: 'Receta eliminada exitosamente',
    });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};