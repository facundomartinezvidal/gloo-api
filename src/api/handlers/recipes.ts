import { Request, Response } from 'express';
import { db } from '../../db';
import { ingredient, instruction, rate, recipe } from '../../db/schema';
import { count, eq } from 'drizzle-orm';
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
    const { title, description, estimatedTime, media } = createRecipeInput.parse(req.body);
    const userId = req.params.userId;
    
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

    const newRecipe = await db.insert(recipe).values({
      title,
      description,
      estimatedTime,
      userId,
      image: mediaUrl,
      mediaType: mediaType,
    }).returning();

    res.json({
      success: true,
      data: newRecipe[0],
    });
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};