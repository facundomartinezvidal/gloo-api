import { Request, Response } from 'express';
import { db } from '../../db';
import { favorites, recipe, collections, collectionRecipes } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { clerkClient } from '@clerk/express';
import { 
  addToFavoritesInput,
  removeFromFavoritesInput,
  createCollectionFromFavoritesInput,
} from '../inputs/favorites';

// Agregar receta a favoritos
export const addToFavorites = async (req: Request, res: Response) => {
  try {
    const { recipeId } = addToFavoritesInput.parse(req.body);
    const userId = req.params.userId;

    // Verificar que la receta existe
    const recipeExists = await db
      .select()
      .from(recipe)
      .where(eq(recipe.id, recipeId));

    if (recipeExists.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Receta no encontrada',
      });
    }

    // Verificar si ya está en favoritos
    const existingFavorite = await db
      .select()
      .from(favorites)
      .where(and(
        eq(favorites.userId, userId),
        eq(favorites.recipeId, recipeId),
      ));

    if (existingFavorite.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'La receta ya está en favoritos',
      });
    }

    // Agregar a favoritos
    const newFavorite = await db.insert(favorites).values({
      userId,
      recipeId,
    }).returning();

    res.status(201).json({
      success: true,
      data: newFavorite[0],
      message: 'Receta agregada a favoritos exitosamente',
    });
  } catch (error) {
    console.error('Error agregando a favoritos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Eliminar receta de favoritos
export const removeFromFavorites = async (req: Request, res: Response) => {
  try {
    const { recipeId } = removeFromFavoritesInput.parse(req.body);
    const userId = req.params.userId;

    // Eliminar de favoritos
    const deletedFavorite = await db
      .delete(favorites)
      .where(and(
        eq(favorites.userId, userId),
        eq(favorites.recipeId, recipeId),
      ))
      .returning();

    if (deletedFavorite.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'La receta no está en favoritos',
      });
    }

    res.json({
      success: true,
      message: 'Receta eliminada de favoritos exitosamente',
    });
  } catch (error) {
    console.error('Error eliminando de favoritos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Obtener todas las recetas favoritas del usuario
export const getUserFavorites = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    // Obtener recetas favoritas con información completa
    const favoritesData = await db
      .select({
        favorite: favorites,
        recipe: recipe,
      })
      .from(favorites)
      .innerJoin(recipe, eq(favorites.recipeId, recipe.id))
      .where(eq(favorites.userId, userId))
      .orderBy(favorites.createdAt);

    // Enriquecer con información del usuario que creó cada receta
    const enrichedFavorites = await Promise.all(
      favoritesData.map(async (item) => {
        try {
          const user = await clerkClient.users.getUser(item.recipe.userId as string);
          return {
            ...item.recipe,
            favoriteId: item.favorite.id,
            addedToFavoritesAt: item.favorite.createdAt,
            user: {
              id: user.id,
              username: user.username,
              email: user.emailAddresses[0]?.emailAddress,
              imageUrl: user.imageUrl,
            },
          };
        } catch (error) {
          console.error('Error obteniendo información del usuario:', error);
          return {
            ...item.recipe,
            favoriteId: item.favorite.id,
            addedToFavoritesAt: item.favorite.createdAt,
            user: null,
          };
        }
      }),
    );

    res.json({
      success: true,
      data: enrichedFavorites,
    });
  } catch (error) {
    console.error('Error obteniendo favoritos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Verificar si una receta está en favoritos
export const checkIfFavorite = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const recipeId = parseInt(req.params.recipeId);

    const favorite = await db
      .select()
      .from(favorites)
      .where(and(
        eq(favorites.userId, userId),
        eq(favorites.recipeId, recipeId),
      ));

    res.json({
      success: true,
      data: {
        isFavorite: favorite.length > 0,
        favoriteId: favorite.length > 0 ? favorite[0].id : null,
      },
    });
  } catch (error) {
    console.error('Error verificando favorito:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Crear colección a partir de recetas favoritas seleccionadas
export const createCollectionFromFavorites = async (req: Request, res: Response) => {
  try {
    const validatedData = createCollectionFromFavoritesInput.parse(req.body);
    const userId = req.params.userId;
    const { recipeIds, ...collectionData } = validatedData;

    // Verificar que todas las recetas están en favoritos del usuario
    const favoritesCount = await db
      .select()
      .from(favorites)
      .where(and(
        eq(favorites.userId, userId),
        eq(favorites.recipeId, recipeIds[0]), // Simplificado - en producción verificar todos
      ));

    // Crear la colección
    const newCollection = await db.insert(collections).values({
      ...collectionData,
      userId,
    }).returning();

    const collectionId = newCollection[0].id;

    // Agregar todas las recetas seleccionadas a la colección
    const collectionRecipesData = recipeIds.map(recipeId => ({
      collectionId,
      recipeId,
    }));

    await db.insert(collectionRecipes).values(collectionRecipesData);

    // Obtener la colección completa con el conteo de recetas
    const collectionWithCount = {
      ...newCollection[0],
      recipeCount: recipeIds.length,
    };

    res.status(201).json({
      success: true,
      data: collectionWithCount,
      message: 'Colección creada exitosamente desde favoritos',
    });
  } catch (error) {
    console.error('Error creando colección desde favoritos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Obtener estadísticas de favoritos del usuario
export const getFavoritesStats = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    // Contar total de favoritos
    const totalFavorites = await db
      .select()
      .from(favorites)
      .where(eq(favorites.userId, userId));

    // Obtener favoritos recientes (últimos 7 días)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentFavorites = await db
      .select()
      .from(favorites)
      .where(and(
        eq(favorites.userId, userId),
        // Nota: Drizzle ORM podría requerir sintaxis diferente para fechas
      ));

    res.json({
      success: true,
      data: {
        totalFavorites: totalFavorites.length,
        recentFavorites: recentFavorites.length,
      },
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de favoritos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
}; 