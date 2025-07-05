import { Request, Response } from 'express';
import { db } from '../../db';
import { ingredient, instruction, rate, recipe, recipeLike, recipeComment, follow } from '../../db/schema';
import { count, eq, avg, inArray } from 'drizzle-orm';
import { clerkClient } from '@clerk/express';
import createRecipeInput from '../inputs/recipes';
import { supabase } from '../lib/supabase';

export const getAllRecipes = async (req: Request, res: Response) => {
  const recipes = await db.select().from(recipe);
  const data = await Promise.all(recipes.map(async (r) => {
    const [rates, comments, likes, ingredients, instructions, averageRating] = await Promise.all([
      db.select({ count: count() }).from(rate).where(eq(rate.recipeId, r.id)),
      db.select({ count: count() }).from(recipeComment).where(eq(recipeComment.recipeId, r.id)),
      db.select({ count: count() }).from(recipeLike).where(eq(recipeLike.recipeId, r.id)),
      db.select().from(ingredient).where(eq(ingredient.recipeId, r.id)),
      db.select().from(instruction).where(eq(instruction.recipeId, r.id)),
      db.select({ avg: avg(rate.rate) }).from(rate).where(eq(rate.recipeId, r.id))
    ]);
    
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
      comments: comments[0].count,
      likes: likes[0].count,
      averageRating: averageRating[0].avg ? parseFloat(averageRating[0].avg.toString()) : 0,
      stats: {
        rates: rates[0].count,
        comments: comments[0].count,
        likes: likes[0].count,
        averageRating: averageRating[0].avg ? parseFloat(averageRating[0].avg.toString()) : 0,
      },
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
      const [rates, comments, ingredients, instructions, averageRating] = await Promise.all([
        db.select({ count: count() }).from(rate).where(eq(rate.recipeId, r.id)),
        db.select({ count: count() }).from(recipeComment).where(eq(recipeComment.recipeId, r.id)),
        db.select().from(ingredient).where(eq(ingredient.recipeId, r.id)),
        db.select().from(instruction).where(eq(instruction.recipeId, r.id)),
        db.select({ avg: avg(rate.rate) }).from(rate).where(eq(rate.recipeId, r.id))
      ]);
      
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
        comments: comments[0].count,
        ingredients: ingredients,
        instructions: instructions,
        averageRating: averageRating[0].avg ? parseFloat(averageRating[0].avg.toString()) : 0,
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
    const { title, description, estimatedTime, servings, media, ingredients, instructions } = createRecipeInput.parse(req.body);
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

    // Create the recipe first
    const newRecipe = await db.insert(recipe).values({
      title,
      description,
      estimatedTime,
      servings,
      userId,
      image: mediaUrl,
      mediaType: mediaType,
    }).returning();

    const recipeId = newRecipe[0].id;

    // Process ingredients if provided
    if (ingredients && ingredients.length > 0) {
      const ingredientsWithRecipeId = ingredients.map(ing => ({
        ...ing,
        recipeId,
      }));
      
      await db.insert(ingredient).values(ingredientsWithRecipeId);
    }

    // Process instructions if provided
    if (instructions && instructions.length > 0) {
      const processedInstructions = await Promise.all(
        instructions.map(async (inst, index) => {
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
              const fileName = `instructions/${recipeId}/${Date.now()}-step-${index + 1}.${extension}`;
              
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
            step: index + 1,
            description: inst.description,
            image: imageUrl,
          };
        }),
      );

      await db.insert(instruction).values(processedInstructions);
    }

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

export const getTrendingRecipes = async (req: Request, res: Response) => {
  try {
    // Obtener todas las recetas con sus likes y ratings
    const recipes = await db.select().from(recipe);
    
    const recipesWithStats = await Promise.all(recipes.map(async (r) => {
      const rates = await db.select({ count: count() }).from(rate).where(eq(rate.recipeId, r.id));
      const likes = await db.select({ count: count() }).from(recipeLike).where(eq(recipeLike.recipeId, r.id));
      const comments = await db.select({ count: count() }).from(recipeComment).where(eq(recipeComment.recipeId, r.id));
      const ingredients = await db.select().from(ingredient).where(eq(ingredient.recipeId, r.id));
      const instructions = await db.select().from(instruction).where(eq(instruction.recipeId, r.id));
      
      let user;
      try {
        user = await clerkClient.users.getUser(r.userId as string);
      } catch (error) {
        user = {
          id: r.userId,
          username: 'Usuario',
          email: '',
          imageUrl: null,
        };
      }
      
      return {
        ...r,
        user: {
          id: user.id,
          username: user.username,
          email: user.emailAddresses?.[0]?.emailAddress || '', 
          imageUrl: user.imageUrl,
        },
        rates: rates[0].count,
        likes: likes[0].count,
        comments: comments[0].count,
        ingredients: ingredients,
        instructions: instructions,
        // Calcular score de trending basado en likes y ratings
        trendingScore: (rates[0].count * 2) + likes[0].count,
      };
    }));
    
    // Ordenar por score de trending (descendente) y tomar las primeras 10
    const trendingRecipes = recipesWithStats
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 10);
    
    res.json({
      success: true,
      data: trendingRecipes,
    });
  } catch (error) {
    console.error('Error getting trending recipes:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

export const getRecipesFromFollowing = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Obtener los usuarios que el usuario actual sigue
    const followingUsers = await db
      .select({ followingId: follow.followingId })
      .from(follow)
      .where(eq(follow.followerId, userId));
    
    if (followingUsers.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No sigues a ningún usuario aún',
      });
    }
    
    // Extraer los IDs de los usuarios seguidos
    const followingIds = followingUsers.map(f => f.followingId);
    
    // Obtener todas las recetas de los usuarios seguidos
    const recipes = await db
      .select()
      .from(recipe)
      .where(inArray(recipe.userId, followingIds));
    
    // Mapear cada receta con sus datos completos
    const data = await Promise.all(recipes.map(async (r) => {
      const [rates, comments, likes, ingredients, instructions, averageRating] = await Promise.all([
        db.select({ count: count() }).from(rate).where(eq(rate.recipeId, r.id)),
        db.select({ count: count() }).from(recipeComment).where(eq(recipeComment.recipeId, r.id)),
        db.select({ count: count() }).from(recipeLike).where(eq(recipeLike.recipeId, r.id)),
        db.select().from(ingredient).where(eq(ingredient.recipeId, r.id)),
        db.select().from(instruction).where(eq(instruction.recipeId, r.id)),
        db.select({ avg: avg(rate.rate) }).from(rate).where(eq(rate.recipeId, r.id))
      ]);
      
      let user;
      try {
        user = await clerkClient.users.getUser(r.userId as string);
      } catch (error) {
        user = {
          id: r.userId,
          username: 'Usuario',
          email: '',
          imageUrl: null,
        };
      }
      
      return {
        ...r,
        user: {
          id: user.id,
          username: user.username,
          email: user.emailAddresses?.[0]?.emailAddress || '', 
          imageUrl: user.imageUrl,
        },
        rates: rates[0].count,
        comments: comments[0].count,
        likes: likes[0].count,
        averageRating: averageRating[0].avg ? parseFloat(averageRating[0].avg.toString()) : 0,
        stats: {
          rates: rates[0].count,
          comments: comments[0].count,
          likes: likes[0].count,
          averageRating: averageRating[0].avg ? parseFloat(averageRating[0].avg.toString()) : 0,
        },
        ingredients: ingredients,
        instructions: instructions,
      };
    }));
    
    // Ordenar por fecha de creación (más recientes primero)
    const sortedData = data.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    res.json({
      success: true,
      data: sortedData,
    });
  } catch (error) {
    console.error('Error getting recipes from following:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};