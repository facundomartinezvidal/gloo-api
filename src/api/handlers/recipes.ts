import { Request, Response } from 'express';
import { db } from '../../db';
import { ingredient, instruction, rate, recipe, recipeLike, recipeComment, users, notification } from '../../db/schema';
import { count, eq, asc, avg, and } from 'drizzle-orm';
import { clerkClient } from '@clerk/express';
import createRecipeInput from '../inputs/recipes';
import { supabase } from '../lib/supabase';
import { getOrganizationAdmins } from '../../middleware/roleCheck';
import fs from 'fs/promises'; // Importar filesystem para leer y borrar el archivo temporal

// Función auxiliar para obtener el nombre del usuario
const getUserName = async (userId: string): Promise<string> => {
  try {
    const user = await clerkClient.users.getUser(userId);
    return user.username || user.firstName || 'Usuario';
  } catch (error) {
    return 'Usuario';
  }
};

// Función auxiliar para notificar a los admins sobre acciones en recetas
const notifyAdminsForRecipeAction = async (recipeId: number, recipeTitle: string, authorId: string, action: 'created' | 'updated' | 'deleted', adminMessage: string) => {
  try {
    // Obtener membresías de organización del autor para determinar qué admins notificar
    const organizationMemberships = await clerkClient.users.getOrganizationMembershipList({ userId: authorId });
    
    if (organizationMemberships.data.length > 0) {
      // Tomar la primera organización del usuario
      const organizationId = organizationMemberships.data[0].organization.id;
      
      // Obtener todos los admins de la organización
      const adminIds = await getOrganizationAdmins(organizationId);
      
      // Filtrar para no notificar al mismo usuario si es admin
      const filteredAdminIds = adminIds.filter(adminId => adminId !== authorId);
      
      // Crear notificaciones para cada admin
      const notifications = filteredAdminIds.map(adminId => ({
        recipientId: adminId,
        senderId: authorId,
        type: action === 'created' ? 'recipe_approval' : 
          action === 'updated' ? 'recipe_update_pending' : 'recipe_delete_pending' as const,
        title: action === 'created' ? 'Nueva receta para revisar' : 
          action === 'updated' ? 'Receta modificada - Requiere re-aprobación' : 'Solicitud de eliminación de receta',
        message: adminMessage,
        relatedId: recipeId,
        relatedType: 'recipe',
      }));

      if (notifications.length > 0) {
        await db.insert(notification).values(notifications);
      }
    }
  } catch (error) {
    console.error(`Error notifying admins for recipe ${action}:`, error);
  }
};

// Función auxiliar para notificar a los admins sobre nueva receta pendiente
const notifyAdminsForRecipeApproval = async (recipeId: number, recipeTitle: string, authorId: string) => {
  const authorName = await getUserName(authorId);
  await notifyAdminsForRecipeAction(
    recipeId, 
    recipeTitle, 
    authorId, 
    'created', 
    `${authorName} ha publicado una nueva receta "${recipeTitle}" que necesita aprobación`,
  );
};

export const getAllRecipes = async (req: Request, res: Response) => {
  // Solo mostrar recetas aprobadas por defecto
  const recipes = await db.select().from(recipe).where(eq(recipe.status, 'approved'));
  const data = await Promise.all(recipes.map(async (r) => {
    const rates = await db.select({ count: count() }).from(rate).where(eq(rate.recipeId, r.id));
    const comments = await db.select({ count: count() }).from(recipeComment).where(eq(recipeComment.recipeId, r.id));
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
      comments: comments[0].count,
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
    const { includeStatus } = req.query;
    
    // Por defecto solo mostrar recetas aprobadas, a menos que se especifique incluir otros estados
    let whereCondition = and(eq(recipe.userId, userId), eq(recipe.status, 'approved'));
    
    // Si el usuario solicita ver todas sus recetas (incluyendo pendientes y rechazadas)
    if (includeStatus === 'all') {
      whereCondition = eq(recipe.userId, userId);
    }
    
    // Obtener recetas del usuario específico
    const recipes = await db.select().from(recipe).where(whereCondition);
    
    // Mapear cada receta con sus datos completos
    const data = await Promise.all(recipes.map(async (r) => {
      const [rates, comments, ingredients, instructions, averageRating] = await Promise.all([
        db.select({ count: count() }).from(rate).where(eq(rate.recipeId, r.id)),
        db.select({ count: count() }).from(recipeComment).where(eq(recipeComment.recipeId, r.id)),
        db.select().from(ingredient).where(eq(ingredient.recipeId, r.id)),
        db.select().from(instruction).where(eq(instruction.recipeId, r.id)),
        db.select({ avg: avg(rate.rate) }).from(rate).where(eq(rate.recipeId, r.id)),
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
  console.log('INICIO createRecipe');
  try {
    // Los datos de FormData llegan como strings, hay que parsearlos
    const { title, description, estimatedTime, servings, media } = req.body;
    const ingredients = JSON.parse(req.body.ingredients || '[]');
    const instructions = JSON.parse(req.body.instructions || '[]');
    const userId = req.params.userId;
    console.log('Datos recibidos:', { title, description, estimatedTime, servings, userId, ingredientsLength: ingredients.length, instructionsLength: instructions.length });
    
    // Verificar si el usuario existe en la tabla local, si no, crearlo
    const existingUser = await db.select().from(users).where(eq(users.externalId, userId));
    
    if (existingUser.length === 0) {
      try {
        console.log('Usuario no existe en tabla local, verificando en Clerk...');
        // Verificar que el usuario existe en Clerk
        await clerkClient.users.getUser(userId);
        
        // Crear el usuario en la tabla local
        await db.insert(users).values({
          externalId: userId,
          description: null,
          idSocialMedia: null,
        });
        console.log('Usuario creado en tabla local');
      } catch (clerkError) {
        console.error('Error fetching user from Clerk:', clerkError);
        console.log('RETURN anticipado: usuario no válido');
        return res.status(400).json({
          success: false,
          error: 'Usuario no válido',
        });
      }
    }
    
    let mediaUrl: string | null = null;
    let mediaType: 'image' | null = null;

    // Solo permitir imágenes (base64 o URL). Si se recibe un archivo, rechazarlo.
    if (req.file) {
      return res.status(400).json({
        success: false,
        error: 'Solo se permite subir imágenes como base64 o URL. El soporte de archivos y video estará disponible en el futuro.'
      });
    }

    // Procesar media si se proporciona
    if (media) {
      // Si es base64, subir a Supabase Storage
      if (media.startsWith('data:')) {
        const [header, base64Data] = media.split(',');
        const mimeMatch = header.match(/data:([^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        if (!mimeType.startsWith('image/')) {
          return res.status(400).json({
            success: false,
            error: 'Solo se permiten archivos de imagen',
          });
        }
        mediaType = 'image';
        const buffer = Buffer.from(base64Data, 'base64');
        const extension = mimeType.split('/')[1];
        const fileName = `recipes/${userId}/${Date.now()}.${extension}`;
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
        const { data: urlData } = supabase.storage
          .from('recipe.content')
          .getPublicUrl(fileName);
        mediaUrl = urlData.publicUrl;
      } else {
        // Si es una URL, solo aceptar imágenes
        if (!media.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          return res.status(400).json({
            success: false,
            error: 'Solo se permiten URLs de imágenes',
          });
        }
        mediaType = 'image';
        mediaUrl = media;
      }
    }

    console.log('Antes de insertar receta');
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
    console.log('Receta insertada:', newRecipe[0]);

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
    }

    // Add instructions if provided
    if (instructions && Array.isArray(instructions) && instructions.length > 0) {
      // Process each instruction and handle image uploads
      const processedInstructions = await Promise.all(
        instructions.map(async (inst, index) => {
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
                const fileName = `instructions/${newRecipe[0].id}/${Date.now()}-step-${index + 1}.${extension}`;
                
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
                // In case of error, don't save the instruction with base64
                throw uploadError;
              }
            } else {
              // If not base64, assume it's a valid URL
              imageUrl = inst.image;
            }
          }

          return {
            recipeId: newRecipe[0].id,
            step: index + 1,
            description: inst.description || inst.step || '',
            image: imageUrl,
          };
        }),
      );

      await db.insert(instruction).values(processedInstructions);
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

    // Notificar a los admins sobre la nueva receta pendiente de aprobación
    await notifyAdminsForRecipeApproval(newRecipe[0].id, title, userId);

    res.json({
      success: true,
      data: completeRecipe,
    });
  } catch (error) {
    console.error('Error creating recipe:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
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

    // Actualizar la receta y cambiar status a pending para re-aprobación
    const updatedRecipe = await db
      .update(recipe)
      .set({
        title,
        description,
        estimatedTime,
        image: mediaUrl,
        mediaType: mediaType,
        status: 'pending', // Cambiar a pending para re-aprobación
        reviewedBy: null, // Limpiar campos de revisión anterior
        reviewedAt: null,
        reviewComment: null,
        updatedAt: new Date(),
      })
      .where(eq(recipe.id, recipeId))
      .returning();

    // Notificar a los admins sobre la edición de la receta que necesita re-aprobación
    if (existingRecipe[0].userId) {
      const authorName = await getUserName(existingRecipe[0].userId as string);
      await notifyAdminsForRecipeAction(
        recipeId,
        title || 'Sin título',
        existingRecipe[0].userId as string,
        'updated',
        `${authorName} ha modificado la receta "${title || 'Sin título'}" y necesita re-aprobación`,
      );
    }

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

    const recipeData = existingRecipe[0];

    // Verificar si la receta ya está marcada para eliminación
    if (recipeData.status === 'delete_pending') {
      return res.status(400).json({
        success: false,
        error: 'La receta ya está pendiente de eliminación',
      });
    }

    // Marcar la receta como pendiente de eliminación
    await db.update(recipe)
      .set({
        status: 'delete_pending',
        updatedAt: new Date(),
      })
      .where(eq(recipe.id, recipeId));

    // Notificar a los admins sobre la solicitud de eliminación
    if (recipeData.userId) {
      const authorName = await getUserName(recipeData.userId as string);
      await notifyAdminsForRecipeAction(
        recipeId,
        recipeData.title || 'Sin título',
        recipeData.userId as string,
        'deleted',
        `${authorName} ha solicitado eliminar la receta "${recipeData.title || 'Sin título'}"`,
      );
    }

    res.json({
      success: true,
      message: 'Solicitud de eliminación enviada. Pendiente de aprobación de admin.',
    });
  } catch (error) {
    console.error('Error requesting recipe deletion:', error);
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

export const getRecipeById = async (req: Request, res: Response) => {
  try {
    const recipeId = parseInt(req.params.id);

    if (isNaN(recipeId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de receta inválido',
      });
    }

    // Obtener la receta
    const recipeData = await db.select()
      .from(recipe)
      .where(eq(recipe.id, recipeId))
      .limit(1);

    if (recipeData.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Receta no encontrada',
      });
    }

    const r = recipeData[0];

    // Obtener datos relacionados en paralelo
    const [rates, comments, ingredients, instructions, averageRating, likes] = await Promise.all([
      db.select({ count: count() }).from(rate).where(eq(rate.recipeId, r.id)),
      db.select({ count: count() }).from(recipeComment).where(eq(recipeComment.recipeId, r.id)),
      db.select().from(ingredient).where(eq(ingredient.recipeId, r.id)).orderBy(asc(ingredient.id)),
      db.select().from(instruction).where(eq(instruction.recipeId, r.id)).orderBy(asc(instruction.step)),
      db.select({ avg: avg(rate.rate) }).from(rate).where(eq(rate.recipeId, r.id)),
      db.select({ count: count() }).from(recipeLike).where(eq(recipeLike.recipeId, r.id)),
    ]);

    // Obtener información del usuario
    const user = await clerkClient.users.getUser(r.userId as string);

    const recipeWithDetails = {
      ...r,
      user: {
        id: user.id,
        username: user.username,
        email: user.emailAddresses?.[0]?.emailAddress || '',
        imageUrl: user.imageUrl,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      rates: rates[0].count,
      likes: likes[0].count,
      comments: comments[0].count,
      ingredients: ingredients,
      instructions: instructions,
      averageRating: averageRating[0].avg ? parseFloat(averageRating[0].avg.toString()) : 0,
    };

    res.json({
      success: true,
      data: recipeWithDetails,
    });
  } catch (error) {
    console.error('Error getting recipe by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

