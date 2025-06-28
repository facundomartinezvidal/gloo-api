import { Request, Response } from 'express';
import { db } from '../../db';
import { collections, collectionRecipes, recipe } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { clerkClient } from '@clerk/express';
import { 
  createCollectionInput,
  updateCollectionInput,
  addRecipeToCollectionInput,
  removeRecipeFromCollectionInput,
} from '../inputs/collections';

// Crear una nueva colección
export const createCollection = async (req: Request, res: Response) => {
  try {
    const validatedData = createCollectionInput.parse(req.body);
    const userId = req.params.userId;

    const newCollection = await db.insert(collections).values({
      ...validatedData,
      userId,
    }).returning();

    res.status(201).json({
      success: true,
      data: newCollection[0],
      message: 'Colección creada exitosamente',
    });
  } catch (error) {
    console.error('Error creando colección:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Obtener todas las colecciones de un usuario
export const getUserCollections = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    const userCollections = await db
      .select({
        id: collections.id,
        name: collections.name,
        description: collections.description,
        icon: collections.icon,
        color: collections.color,
        isPublic: collections.isPublic,
        createdAt: collections.createdAt,
        updatedAt: collections.updatedAt,
      })
      .from(collections)
      .where(eq(collections.userId, userId));

    // Obtener el conteo de recetas para cada colección
    const collectionsWithCount = await Promise.all(
      userCollections.map(async (collection) => {
        const recipeCount = await db
          .select()
          .from(collectionRecipes)
          .where(eq(collectionRecipes.collectionId, collection.id));

        return {
          ...collection,
          recipeCount: recipeCount.length,
        };
      }),
    );

    res.json({
      success: true,
      data: collectionsWithCount,
    });
  } catch (error) {
    console.error('Error obteniendo colecciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Obtener las recetas de una colección específica
export const getCollectionRecipes = async (req: Request, res: Response) => {
  try {
    const collectionId = parseInt(req.params.collectionId);
    const userId = req.params.userId;

    // Verificar que la colección pertenece al usuario
    const collection = await db
      .select()
      .from(collections)
      .where(and(
        eq(collections.id, collectionId),
        eq(collections.userId, userId),
      ));

    if (collection.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Colección no encontrada',
      });
    }

    // Obtener las recetas de la colección con información completa
    const recipesData = await db
      .select({
        recipe: recipe,
        addedAt: collectionRecipes.addedAt,
      })
      .from(collectionRecipes)
      .innerJoin(recipe, eq(collectionRecipes.recipeId, recipe.id))
      .where(eq(collectionRecipes.collectionId, collectionId));

    // Enriquecer con información del usuario que creó cada receta
    const enrichedRecipes = await Promise.all(
      recipesData.map(async (item) => {
        try {
          const user = await clerkClient.users.getUser(item.recipe.userId as string);
          return {
            ...item.recipe,
            addedAt: item.addedAt,
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
            addedAt: item.addedAt,
            user: null,
          };
        }
      }),
    );

    res.json({
      success: true,
      data: {
        collection: collection[0],
        recipes: enrichedRecipes,
      },
    });
  } catch (error) {
    console.error('Error obteniendo recetas de la colección:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Agregar una receta a una colección
export const addRecipeToCollection = async (req: Request, res: Response) => {
  try {
    const { recipeId } = addRecipeToCollectionInput.parse(req.body);
    const collectionId = parseInt(req.params.collectionId);
    const userId = req.params.userId;

    // Verificar que la colección pertenece al usuario
    const collection = await db
      .select()
      .from(collections)
      .where(and(
        eq(collections.id, collectionId),
        eq(collections.userId, userId),
      ));

    if (collection.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Colección no encontrada',
      });
    }

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

    // Verificar si la receta ya está en la colección
    const existingRelation = await db
      .select()
      .from(collectionRecipes)
      .where(and(
        eq(collectionRecipes.collectionId, collectionId),
        eq(collectionRecipes.recipeId, recipeId),
      ));

    if (existingRelation.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'La receta ya está en esta colección',
      });
    }

    // Agregar la receta a la colección
    const newRelation = await db.insert(collectionRecipes).values({
      collectionId,
      recipeId,
    }).returning();

    res.status(201).json({
      success: true,
      data: newRelation[0],
      message: 'Receta agregada a la colección exitosamente',
    });
  } catch (error) {
    console.error('Error agregando receta a la colección:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Eliminar una receta de una colección
export const removeRecipeFromCollection = async (req: Request, res: Response) => {
  try {
    const { recipeId } = removeRecipeFromCollectionInput.parse(req.body);
    const collectionId = parseInt(req.params.collectionId);
    const userId = req.params.userId;

    // Verificar que la colección pertenece al usuario
    const collection = await db
      .select()
      .from(collections)
      .where(and(
        eq(collections.id, collectionId),
        eq(collections.userId, userId),
      ));

    if (collection.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Colección no encontrada',
      });
    }

    // Eliminar la relación
    const deletedRelation = await db
      .delete(collectionRecipes)
      .where(and(
        eq(collectionRecipes.collectionId, collectionId),
        eq(collectionRecipes.recipeId, recipeId),
      ))
      .returning();

    if (deletedRelation.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'La receta no está en esta colección',
      });
    }

    res.json({
      success: true,
      message: 'Receta eliminada de la colección exitosamente',
    });
  } catch (error) {
    console.error('Error eliminando receta de la colección:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Actualizar una colección
export const updateCollection = async (req: Request, res: Response) => {
  try {
    const validatedData = updateCollectionInput.parse(req.body);
    const collectionId = parseInt(req.params.collectionId);
    const userId = req.params.userId;

    // Verificar que la colección pertenece al usuario
    const collection = await db
      .select()
      .from(collections)
      .where(and(
        eq(collections.id, collectionId),
        eq(collections.userId, userId),
      ));

    if (collection.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Colección no encontrada',
      });
    }

    // Actualizar la colección
    const updatedCollection = await db
      .update(collections)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(collections.id, collectionId))
      .returning();

    res.json({
      success: true,
      data: updatedCollection[0],
      message: 'Colección actualizada exitosamente',
    });
  } catch (error) {
    console.error('Error actualizando colección:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Eliminar una colección
export const deleteCollection = async (req: Request, res: Response) => {
  try {
    const collectionId = parseInt(req.params.collectionId);
    const userId = req.params.userId;

    // Verificar que la colección pertenece al usuario
    const collection = await db
      .select()
      .from(collections)
      .where(and(
        eq(collections.id, collectionId),
        eq(collections.userId, userId),
      ));

    if (collection.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Colección no encontrada',
      });
    }

    // Eliminar todas las relaciones de recetas de la colección
    await db
      .delete(collectionRecipes)
      .where(eq(collectionRecipes.collectionId, collectionId));

    // Eliminar la colección
    await db
      .delete(collections)
      .where(eq(collections.id, collectionId));

    res.json({
      success: true,
      message: 'Colección eliminada exitosamente',
    });
  } catch (error) {
    console.error('Error eliminando colección:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
}; 