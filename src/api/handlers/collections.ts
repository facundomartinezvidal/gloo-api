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
    console.log('Getting collections for user:', userId);

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

    console.log('Found collections:', userCollections);

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

    console.log('Collections with count:', collectionsWithCount);

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

// Crear colecciones por defecto para un usuario si no existen
export const ensureDefaultCollections = async (userId: string) => {
  try {
    console.log('Ensuring default collections for user:', userId);
    
    // Verificar si ya existen las colecciones por defecto
    const existingCollections = await db
      .select()
      .from(collections)
      .where(eq(collections.userId, userId));

    console.log('Existing collections:', existingCollections);

    const existingNames = existingCollections.map(c => c.name);
    console.log('Existing collection names:', existingNames);
    
    // Crear colección "Favoritos" si no existe
    if (!existingNames.includes('Favoritos')) {
      console.log('Creating Favoritos collection...');
      await db.insert(collections).values({
        userId,
        name: 'Favoritos',
        description: 'Mis recetas favoritas',
        icon: 'heart',
        color: '#FF6B6B',
        isPublic: 'false',
      });
      console.log('Favoritos collection created');
    }

    // Crear colección "Salty" si no existe
    if (!existingNames.includes('Salty')) {
      console.log('Creating Salty collection...');
      await db.insert(collections).values({
        userId,
        name: 'Salty',
        description: 'Recetas saladas que me encantan',
        icon: 'restaurant',
        color: '#4CAF50',
        isPublic: 'false',
      });
      console.log('Salty collection created');
    }

    // Crear colección "Dulce" si no existe
    if (!existingNames.includes('Dulce')) {
      console.log('Creating Dulce collection...');
      await db.insert(collections).values({
        userId,
        name: 'Dulce',
        description: 'Recetas dulces y postres',
        icon: 'ice-cream',
        color: '#FF9800',
        isPublic: 'false',
      });
      console.log('Dulce collection created');
    }

    // Retornar todas las colecciones del usuario con conteo de recetas
    const updatedCollections = await db
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

    console.log('Updated collections:', updatedCollections);

    // Obtener el conteo de recetas para cada colección
    const collectionsWithCount = await Promise.all(
      updatedCollections.map(async (collection) => {
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

    console.log('Final collections with count:', collectionsWithCount);

    return collectionsWithCount;
  } catch (error) {
    console.error('Error ensuring default collections:', error);
    throw error;
  }
};

// Crear colección por defecto para un usuario si no existe
export const ensureDefaultCollection = async (userId: string) => {
  try {
    // Verificar si ya existe una colección por defecto
    const existingDefault = await db
      .select()
      .from(collections)
      .where(and(
        eq(collections.userId, userId),
        eq(collections.name, 'Favoritos')
      ));

    if (existingDefault.length === 0) {
      // Crear colección por defecto
      const defaultCollection = await db.insert(collections).values({
        userId,
        name: 'Favoritos',
        description: 'Mis recetas favoritas',
        icon: 'heart',
        color: '#FF6B6B',
        isPublic: 'false',
      }).returning();

      return defaultCollection[0];
    }

    return existingDefault[0];
  } catch (error) {
    console.error('Error ensuring default collection:', error);
    throw error;
  }
};

// Agregar una receta a la colección por defecto (Favoritos)
export const addRecipeToDefaultCollection = async (req: Request, res: Response) => {
  try {
    const { recipeId } = addRecipeToCollectionInput.parse(req.body);
    const userId = req.params.userId;

    // Asegurar que existe la colección por defecto
    const defaultCollection = await ensureDefaultCollection(userId);

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
        eq(collectionRecipes.collectionId, defaultCollection.id),
        eq(collectionRecipes.recipeId, recipeId)
      ));

    if (existingRelation.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'La receta ya está en favoritos',
      });
    }

    // Agregar la receta a la colección
    await db.insert(collectionRecipes).values({
      collectionId: defaultCollection.id,
      recipeId,
    });

    res.json({
      success: true,
      message: 'Receta agregada a favoritos',
    });
  } catch (error) {
    console.error('Error adding recipe to default collection:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Remover una receta de la colección por defecto
export const removeRecipeFromDefaultCollection = async (req: Request, res: Response) => {
  try {
    const { recipeId } = removeRecipeFromCollectionInput.parse(req.body);
    const userId = req.params.userId;

    // Obtener la colección por defecto
    const defaultCollection = await db
      .select()
      .from(collections)
      .where(and(
        eq(collections.userId, userId),
        eq(collections.name, 'Favoritos')
      ));

    if (defaultCollection.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Colección de favoritos no encontrada',
      });
    }

    // Remover la receta de la colección
    await db
      .delete(collectionRecipes)
      .where(and(
        eq(collectionRecipes.collectionId, defaultCollection[0].id),
        eq(collectionRecipes.recipeId, recipeId)
      ));

    res.json({
      success: true,
      message: 'Receta removida de favoritos',
    });
  } catch (error) {
    console.error('Error removing recipe from default collection:', error);
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

// Crear colección "Changed" para recetas modificadas
export const ensureChangedCollection = async (userId: string) => {
  try {
    // Verificar si ya existe la colección "Changed"
    const existingChanged = await db
      .select()
      .from(collections)
      .where(and(
        eq(collections.userId, userId),
        eq(collections.name, 'Changed')
      ));

    if (existingChanged.length === 0) {
      // Crear colección "Changed"
      const changedCollection = await db.insert(collections).values({
        userId,
        name: 'Changed',
        description: 'Recetas modificadas por el usuario',
        icon: 'create-outline',
        color: '#8B5CF6',
        isPublic: 'false',
      }).returning();

      return changedCollection[0];
    }

    return existingChanged[0];
  } catch (error) {
    console.error('Error ensuring Changed collection:', error);
    throw error;
  }
};

// Agregar una receta a la colección "Changed"
export const addRecipeToChangedCollection = async (req: Request, res: Response) => {
  try {
    const { recipeId } = addRecipeToCollectionInput.parse(req.body);
    const userId = req.params.userId;

    // Asegurar que existe la colección "Changed"
    const changedCollection = await ensureChangedCollection(userId);

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
        eq(collectionRecipes.collectionId, changedCollection.id),
        eq(collectionRecipes.recipeId, recipeId)
      ));

    if (existingRelation.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'La receta ya está en la colección Changed',
      });
    }

    // Agregar la receta a la colección
    await db.insert(collectionRecipes).values({
      collectionId: changedCollection.id,
      recipeId,
    });

    res.json({
      success: true,
      message: 'Receta agregada a la colección Changed',
    });
  } catch (error) {
    console.error('Error adding recipe to Changed collection:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Obtener recetas de la colección "Changed"
export const getChangedCollectionRecipes = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    // Asegurar que existe la colección "Changed"
    const changedCollection = await ensureChangedCollection(userId);

    // Obtener las recetas de la colección con información completa
    const recipesData = await db
      .select({
        recipe: recipe,
        addedAt: collectionRecipes.addedAt,
      })
      .from(collectionRecipes)
      .innerJoin(recipe, eq(collectionRecipes.recipeId, recipe.id))
      .where(eq(collectionRecipes.collectionId, changedCollection.id));

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
        collection: changedCollection,
        recipes: enrichedRecipes,
      },
    });
  } catch (error) {
    console.error('Error obteniendo recetas de Changed:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
}; 