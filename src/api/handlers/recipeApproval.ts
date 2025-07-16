import { Response } from 'express';
import { db } from '../../db';
import { recipe, notification } from '../../db/schema';
import { eq, and, desc, count, or } from 'drizzle-orm';
import { clerkClient } from '@clerk/express';
import { approveRecipeInput, rejectRecipeInput, getPendingRecipesInput, getReviewedRecipesInput } from '../inputs/recipeApproval';
import { AuthenticatedRequest } from '../../middleware/roleCheck';

// Obtener todas las recetas pendientes de aprobación
export const getPendingRecipes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 20 } = getPendingRecipesInput.parse({
      ...req.query,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    });

    const offset = (page - 1) * limit;

    // Obtener recetas pendientes
    const pendingRecipes = await db.select()
      .from(recipe)
      .where(eq(recipe.status, 'pending'))
      .orderBy(desc(recipe.createdAt))
      .limit(limit)
      .offset(offset);

    // Obtener información completa de cada receta
    const recipesWithDetails = await Promise.all(
      pendingRecipes.map(async (r) => {
        try {
          const author = await clerkClient.users.getUser(r.userId as string);
          return {
            ...r,
            author: {
              id: author.id,
              username: author.username,
              email: author.emailAddresses[0]?.emailAddress,
              imageUrl: author.imageUrl,
              firstName: author.firstName,
              lastName: author.lastName,
            },
          };
        } catch (error) {
          console.error(`Error getting author info for recipe ${r.id}:`, error);
          return {
            ...r,
            author: null,
          };
        }
      }),
    );

    // Contar total de recetas pendientes
    const totalCount = await db.select({ count: count() })
      .from(recipe)
      .where(eq(recipe.status, 'pending'));

    res.json({
      success: true,
      data: {
        recipes: recipesWithDetails,
        pagination: {
          page,
          limit,
          total: totalCount[0].count,
          totalPages: Math.ceil(totalCount[0].count / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error getting pending recipes:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Aprobar una receta
export const approveRecipe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const recipeId = parseInt(req.params.recipeId);
    const { comment } = approveRecipeInput.parse(req.body);
    const adminId = req.userId!;

    if (isNaN(recipeId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de receta inválido',
      });
    }

    // Verificar que la receta existe y está pendiente
    const existingRecipe = await db.select()
      .from(recipe)
      .where(and(
        eq(recipe.id, recipeId),
        eq(recipe.status, 'pending'),
      ))
      .limit(1);

    if (existingRecipe.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Receta no encontrada o ya procesada',
      });
    }

    const recipeData = existingRecipe[0];

    // Actualizar el estado de la receta
    await db.update(recipe)
      .set({
        status: 'approved',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewComment: comment || null,
        updatedAt: new Date(),
      })
      .where(eq(recipe.id, recipeId));

    // Notificar al autor sobre la aprobación
    try {
      const admin = await clerkClient.users.getUser(adminId);
      const adminName = admin.username || admin.firstName || 'Admin';

      await db.insert(notification).values({
        recipientId: recipeData.userId!,
        senderId: adminId,
        type: 'recipe_approved',
        title: 'Receta aprobada',
        message: `Tu receta "${recipeData.title}" ha sido aprobada por ${adminName}${comment ? `: ${comment}` : ''}`,
        relatedId: recipeId,
        relatedType: 'recipe',
      });
    } catch (notificationError) {
      console.error('Error creating approval notification:', notificationError);
    }

    res.json({
      success: true,
      message: 'Receta aprobada exitosamente',
    });
  } catch (error) {
    console.error('Error approving recipe:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Rechazar una receta
export const rejectRecipe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const recipeId = parseInt(req.params.recipeId);
    const { comment } = rejectRecipeInput.parse(req.body);
    const adminId = req.userId!;

    if (isNaN(recipeId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de receta inválido',
      });
    }

    // Verificar que la receta existe y está pendiente
    const existingRecipe = await db.select()
      .from(recipe)
      .where(and(
        eq(recipe.id, recipeId),
        eq(recipe.status, 'pending'),
      ))
      .limit(1);

    if (existingRecipe.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Receta no encontrada o ya procesada',
      });
    }

    const recipeData = existingRecipe[0];

    // Actualizar el estado de la receta
    await db.update(recipe)
      .set({
        status: 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewComment: comment,
        updatedAt: new Date(),
      })
      .where(eq(recipe.id, recipeId));

    // Notificar al autor sobre el rechazo
    try {
      const admin = await clerkClient.users.getUser(adminId);
      const adminName = admin.username || admin.firstName || 'Admin';

      await db.insert(notification).values({
        recipientId: recipeData.userId!,
        senderId: adminId,
        type: 'recipe_rejected',
        title: 'Receta rechazada',
        message: `Tu receta "${recipeData.title}" ha sido rechazada por ${adminName}${comment ? `: ${comment}` : ''}`,
        relatedId: recipeId,
        relatedType: 'recipe',
      });
    } catch (notificationError) {
      console.error('Error creating rejection notification:', notificationError);
    }

    res.json({
      success: true,
      message: 'Receta rechazada exitosamente',
    });
  } catch (error) {
    console.error('Error rejecting recipe:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Obtener recetas revisadas por un admin específico
export const getRecipesReviewedByAdmin = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.userId!;
    const { page = 1, limit = 20, status } = getReviewedRecipesInput.parse({
      ...req.query,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    });

    const offset = (page - 1) * limit;

    // Construir condiciones de filtro
    let whereConditions = eq(recipe.reviewedBy, adminId);
    
    // Filtrar por estado si se especifica
    if (status && (status === 'approved' || status === 'rejected')) {
      whereConditions = and(whereConditions, eq(recipe.status, status))!;
    } else {
      // Por defecto mostrar solo aprobadas y rechazadas (excluir pendientes)
      whereConditions = and(whereConditions, or(eq(recipe.status, 'approved'), eq(recipe.status, 'rejected')))!;
    }

    // Obtener recetas revisadas por el admin
    const reviewedRecipes = await db.select()
      .from(recipe)
      .where(whereConditions)
      .orderBy(desc(recipe.reviewedAt))
      .limit(limit)
      .offset(offset);

    // Obtener información completa de cada receta
    const recipesWithDetails = await Promise.all(
      reviewedRecipes.map(async (r) => {
        try {
          const author = await clerkClient.users.getUser(r.userId as string);
          return {
            ...r,
            author: {
              id: author.id,
              username: author.username,
              email: author.emailAddresses[0]?.emailAddress,
              imageUrl: author.imageUrl,
              firstName: author.firstName,
              lastName: author.lastName,
            },
          };
        } catch (error) {
          console.error(`Error getting author info for recipe ${r.id}:`, error);
          return {
            ...r,
            author: null,
          };
        }
      }),
    );

    // Contar total de recetas revisadas por el admin
    const totalCount = await db.select({ count: count() })
      .from(recipe)
      .where(whereConditions);

    res.json({
      success: true,
      data: {
        recipes: recipesWithDetails,
        pagination: {
          page,
          limit,
          total: totalCount[0].count,
          totalPages: Math.ceil(totalCount[0].count / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error getting recipes reviewed by admin:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Obtener estadísticas de aprobación para admin dashboard
export const getApprovalStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
      db.select({ count: count() }).from(recipe).where(eq(recipe.status, 'pending')),
      db.select({ count: count() }).from(recipe).where(eq(recipe.status, 'approved')),
      db.select({ count: count() }).from(recipe).where(eq(recipe.status, 'rejected')),
    ]);

    res.json({
      success: true,
      data: {
        pending: pendingCount[0].count,
        approved: approvedCount[0].count,
        rejected: rejectedCount[0].count,
        total: pendingCount[0].count + approvedCount[0].count + rejectedCount[0].count,
      },
    });
  } catch (error) {
    console.error('Error getting approval stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Obtener estadísticas personales de un admin específico
export const getAdminPersonalStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.userId!;
    
    const [approvedByAdmin, rejectedByAdmin] = await Promise.all([
      db.select({ count: count() }).from(recipe).where(and(eq(recipe.reviewedBy, adminId), eq(recipe.status, 'approved'))),
      db.select({ count: count() }).from(recipe).where(and(eq(recipe.reviewedBy, adminId), eq(recipe.status, 'rejected'))),
    ]);

    res.json({
      success: true,
      data: {
        approvedByMe: approvedByAdmin[0].count,
        rejectedByMe: rejectedByAdmin[0].count,
        totalReviewedByMe: approvedByAdmin[0].count + rejectedByAdmin[0].count,
      },
    });
  } catch (error) {
    console.error('Error getting admin personal stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
}; 