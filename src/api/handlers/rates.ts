import { Request, Response } from 'express';
import { db } from '../../db';
import { rate, recipe, users, notification } from '../../db/schema';
import { eq, and, count, avg } from 'drizzle-orm';
import { clerkClient } from '@clerk/express';
import { rateRecipeInput, updateRateInput, deleteRateInput } from '../inputs/rates';

// Función auxiliar para crear notificación de rating
const createRatingNotification = async (raterUserId: string, recipeOwnerId: string, recipeId: number, recipeTitle: string, ratingValue: number) => {
  if (raterUserId === recipeOwnerId) return; // No notificar si es el mismo usuario

  try {
    const raterUser = await clerkClient.users.getUser(raterUserId);
    const raterName = raterUser.username || raterUser.firstName || 'Alguien';
    
    await db.insert(notification).values({
      recipientId: recipeOwnerId,
      senderId: raterUserId,
      type: 'rating',
      title: 'Nueva calificación',
      message: `${raterName} calificó tu receta "${recipeTitle}" con ${ratingValue} estrellas`,
      relatedId: recipeId,
      relatedType: 'recipe',
    });
  } catch (error) {
    console.error('Error creating rating notification:', error);
  }
};

export const rateRecipe = async (req: Request, res: Response) => {
  try {
    const { recipeId, rate: ratingValue } = rateRecipeInput.parse(req.body);
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

    // Verificar si ya existe un rating del usuario para esta receta
    const existingRating = await db.select()
      .from(rate)
      .where(and(
        eq(rate.recipeId, recipeId),
        eq(rate.userId, userId),
      ))
      .limit(1);

    if (existingRating.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User has already rated this recipe',
      });
    }

    // Crear el rating
    const newRating = await db.insert(rate).values({
      recipeId,
      userId,
      rate: ratingValue,
    }).returning();

    // Crear notificación para el dueño de la receta
    await createRatingNotification(userId, recipeExists[0].userId!, recipeId, recipeExists[0].title!, ratingValue);

    // Obtener estadísticas actualizadas
    const [totalRatings, averageRating] = await Promise.all([
      db.select({ count: count() }).from(rate).where(eq(rate.recipeId, recipeId)),
      db.select({ avg: avg(rate.rate) }).from(rate).where(eq(rate.recipeId, recipeId))
    ]);

    res.json({
      success: true,
      data: {
        rating: newRating[0],
        stats: {
          totalRatings: totalRatings[0].count,
          averageRating: averageRating[0].avg ? parseFloat(averageRating[0].avg.toString()) : 0,
        }
      },
      message: 'Recipe rated successfully',
    });
  } catch (error) {
    console.error('Error rating recipe:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const updateRate = async (req: Request, res: Response) => {
  try {
    const { recipeId, rate: ratingValue } = updateRateInput.parse(req.body);
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

    // Verificar si existe un rating del usuario para esta receta
    const existingRating = await db.select()
      .from(rate)
      .where(and(
        eq(rate.recipeId, recipeId),
        eq(rate.userId, userId),
      ))
      .limit(1);

    if (existingRating.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Rating not found',
      });
    }

    // Actualizar el rating
    const updatedRating = await db.update(rate)
      .set({
        rate: ratingValue,
        updatedAt: new Date(),
      })
      .where(and(
        eq(rate.recipeId, recipeId),
        eq(rate.userId, userId),
      ))
      .returning();

    // Obtener estadísticas actualizadas
    const [totalRatings, averageRating] = await Promise.all([
      db.select({ count: count() }).from(rate).where(eq(rate.recipeId, recipeId)),
      db.select({ avg: avg(rate.rate) }).from(rate).where(eq(rate.recipeId, recipeId))
    ]);

    res.json({
      success: true,
      data: {
        rating: updatedRating[0],
        stats: {
          totalRatings: totalRatings[0].count,
          averageRating: averageRating[0].avg ? parseFloat(averageRating[0].avg.toString()) : 0,
        }
      },
      message: 'Rating updated successfully',
    });
  } catch (error) {
    console.error('Error updating rating:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const deleteRate = async (req: Request, res: Response) => {
  try {
    const { recipeId } = deleteRateInput.parse(req.body);
    const userId = req.params.userId;

    // Verificar si existe un rating del usuario para esta receta
    const existingRating = await db.select()
      .from(rate)
      .where(and(
        eq(rate.recipeId, recipeId),
        eq(rate.userId, userId),
      ))
      .limit(1);

    if (existingRating.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Rating not found',
      });
    }

    // Eliminar el rating
    await db.delete(rate)
      .where(and(
        eq(rate.recipeId, recipeId),
        eq(rate.userId, userId),
      ));

    // Obtener estadísticas actualizadas
    const [totalRatings, averageRating] = await Promise.all([
      db.select({ count: count() }).from(rate).where(eq(rate.recipeId, recipeId)),
      db.select({ avg: avg(rate.rate) }).from(rate).where(eq(rate.recipeId, recipeId))
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalRatings: totalRatings[0].count,
          averageRating: averageRating[0].avg ? parseFloat(averageRating[0].avg.toString()) : 0,
        }
      },
      message: 'Rating deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting rating:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getRecipeRatings = async (req: Request, res: Response) => {
  try {
    const recipeId = parseInt(req.params.recipeId);

    if (isNaN(recipeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipe ID',
      });
    }

    // Obtener todos los ratings de la receta
    const ratings = await db.select({
      id: rate.id,
      userId: rate.userId,
      rate: rate.rate,
      createdAt: rate.createdAt,
    })
      .from(rate)
      .where(eq(rate.recipeId, recipeId));

    // Obtener información de los usuarios que calificaron
    const ratingsWithUserInfo = await Promise.all(
      ratings.map(async (rating) => {
        try {
          const user = await clerkClient.users.getUser(rating.userId);
          return {
            id: rating.id,
            userId: rating.userId,
            rate: rating.rate,
            createdAt: rating.createdAt,
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
          console.error(`Error getting user info for ${rating.userId}:`, error);
          return {
            id: rating.id,
            userId: rating.userId,
            rate: rating.rate,
            createdAt: rating.createdAt,
            user: null,
          };
        }
      }),
    );

    // Obtener estadísticas
    const [totalRatings, averageRating] = await Promise.all([
      db.select({ count: count() }).from(rate).where(eq(rate.recipeId, recipeId)),
      db.select({ avg: avg(rate.rate) }).from(rate).where(eq(rate.recipeId, recipeId))
    ]);

    res.json({
      success: true,
      data: {
        ratings: ratingsWithUserInfo,
        stats: {
          totalRatings: totalRatings[0].count,
          averageRating: averageRating[0].avg ? parseFloat(averageRating[0].avg.toString()) : 0,
        }
      },
    });
  } catch (error) {
    console.error('Error getting recipe ratings:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const checkRatingStatus = async (req: Request, res: Response) => {
  try {
    const recipeId = parseInt(req.params.recipeId);
    const userId = req.params.userId;

    if (isNaN(recipeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipe ID',
      });
    }

    // Verificar si el usuario ha calificado la receta
    const userRating = await db.select({
      id: rate.id,
      rate: rate.rate,
      createdAt: rate.createdAt,
    })
      .from(rate)
      .where(and(
        eq(rate.recipeId, recipeId),
        eq(rate.userId, userId),
      ))
      .limit(1);

    res.json({
      success: true,
      data: {
        hasRated: userRating.length > 0,
        rating: userRating.length > 0 ? userRating[0] : null,
      },
    });
  } catch (error) {
    console.error('Error checking rating status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}; 