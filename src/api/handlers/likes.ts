import { Request, Response } from 'express';
import { db } from '../../db';
import { recipeLike, recipe, users, notification } from '../../db/schema';
import { eq, and, count } from 'drizzle-orm';
import { clerkClient } from '@clerk/express';
import { likeRecipeInput, unlikeRecipeInput } from '../inputs/likes';

// Función auxiliar para crear notificación de like
const createLikeNotification = async (likerUserId: string, recipeOwnerId: string, recipeId: number, recipeTitle: string) => {
  if (likerUserId === recipeOwnerId) return; // No notificar si es el mismo usuario

  try {
    const likerUser = await clerkClient.users.getUser(likerUserId);
    const likerName = likerUser.username || likerUser.firstName || 'Alguien';
    
    await db.insert(notification).values({
      recipientId: recipeOwnerId,
      senderId: likerUserId,
      type: 'like',
      title: 'Nueva reacción',
      message: `${likerName} le dio like a tu receta "${recipeTitle}"`,
      relatedId: recipeId,
      relatedType: 'recipe',
    });
  } catch (error) {
    console.error('Error creating like notification:', error);
  }
};

export const likeRecipe = async (req: Request, res: Response) => {
  try {
    const { recipeId } = likeRecipeInput.parse(req.body);
    const userId = req.params.userId;

    // Verificar que la receta existe
    const recipeExists = await db.select()
      .from(recipe)
      .where(eq(recipe.id, recipeId))
      .limit(1);

    if (recipeExists.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found',
      });
    }

    // Verificar que el usuario existe
    const userExists = await db.select()
      .from(users)
      .where(eq(users.externalId, userId))
      .limit(1);

    if (userExists.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Verificar si ya existe el like
    const existingLike = await db.select()
      .from(recipeLike)
      .where(and(
        eq(recipeLike.recipeId, recipeId),
        eq(recipeLike.userId, userId),
      ))
      .limit(1);

    if (existingLike.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Recipe already liked',
      });
    }

    // Crear el like
    const newLike = await db.insert(recipeLike).values({
      recipeId,
      userId,
    }).returning();

    // Crear notificación para el dueño de la receta
    await createLikeNotification(userId, recipeExists[0].userId!, recipeId, recipeExists[0].title!);

    res.json({
      success: true,
      data: newLike[0],
      message: 'Recipe liked successfully',
    });
  } catch (error) {
    console.error('Error liking recipe:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const unlikeRecipe = async (req: Request, res: Response) => {
  try {
    const { recipeId } = unlikeRecipeInput.parse(req.body);
    const userId = req.params.userId;

    // Verificar si existe el like
    const existingLike = await db.select()
      .from(recipeLike)
      .where(and(
        eq(recipeLike.recipeId, recipeId),
        eq(recipeLike.userId, userId),
      ))
      .limit(1);

    if (existingLike.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Like not found',
      });
    }

    // Eliminar el like
    await db.delete(recipeLike)
      .where(and(
        eq(recipeLike.recipeId, recipeId),
        eq(recipeLike.userId, userId),
      ));

    res.json({
      success: true,
      message: 'Recipe unliked successfully',
    });
  } catch (error) {
    console.error('Error unliking recipe:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getRecipeLikes = async (req: Request, res: Response) => {
  try {
    const recipeId = parseInt(req.params.recipeId);

    if (isNaN(recipeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipe ID',
      });
    }

    // Obtener todos los likes de la receta
    const likes = await db.select({
      id: recipeLike.id,
      userId: recipeLike.userId,
      createdAt: recipeLike.createdAt,
    })
      .from(recipeLike)
      .where(eq(recipeLike.recipeId, recipeId));

    // Obtener información de los usuarios que dieron like
    const likesWithUserInfo = await Promise.all(
      likes.map(async (like) => {
        try {
          const user = await clerkClient.users.getUser(like.userId);
          return {
            id: like.id,
            userId: like.userId,
            createdAt: like.createdAt,
            user: {
              id: user.id,
              username: user.username,
              email: user.emailAddresses[0]?.emailAddress,
              imageUrl: user.imageUrl,
              firstName: user.firstName,
              lastName: user.lastName,
            },
          };
        } catch (error) {
          console.error(`Error getting user info for ${like.userId}:`, error);
          return {
            id: like.id,
            userId: like.userId,
            createdAt: like.createdAt,
            user: null,
          };
        }
      }),
    );

    // Contar total de likes
    const totalLikes = await db.select({ count: count() })
      .from(recipeLike)
      .where(eq(recipeLike.recipeId, recipeId));

    res.json({
      success: true,
      data: {
        likes: likesWithUserInfo,
        total: totalLikes[0].count,
      },
    });
  } catch (error) {
    console.error('Error getting recipe likes:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const checkLikeStatus = async (req: Request, res: Response) => {
  try {
    const recipeId = parseInt(req.params.recipeId);
    const userId = req.params.userId;

    if (isNaN(recipeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipe ID',
      });
    }

    // Verificar si el usuario ha dado like a la receta
    const isLiked = await db.select()
      .from(recipeLike)
      .where(and(
        eq(recipeLike.recipeId, recipeId),
        eq(recipeLike.userId, userId),
      ))
      .limit(1);

    res.json({
      success: true,
      data: {
        isLiked: isLiked.length > 0,
      },
    });
  } catch (error) {
    console.error('Error checking like status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}; 