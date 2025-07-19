import { Request, Response } from 'express';
import { db } from '../../db';
import { 
  recipe, 
  ingredient, 
  instruction, 
  rate, 
  recipeLike, 
  recipeComment,
  categories,
  recipeCategories,
  searchHistory,
  searchSuggestions,
} from '../../db/schema';
import { and, desc, eq, ilike, or, sql, count, asc } from 'drizzle-orm';
import { clerkClient } from '@clerk/express';
import { 
  searchRecipesInput, 
  addToHistoryInput, 
  createCategoryInput,
} from '../inputs/search';

// Búsqueda principal de recetas
export const searchRecipes = async (req: Request, res: Response) => {
  try {
    const { query, categoryId, page, limit, sortBy, maxDuration, excludeIngredients } = searchRecipesInput.parse({
      ...req.query,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined,
      maxDuration: req.query.maxDuration ? parseInt(req.query.maxDuration as string) : undefined,
    });

    const offset = (page - 1) * limit;

    // Construir condiciones base
    const conditions = [];

    // Solo mostrar recetas aprobadas
    conditions.push(eq(recipe.status, 'approved'));

    // Búsqueda por texto en título y descripción
    if (query) {
      const textSearchCondition = or(
        ilike(recipe.title, `%${query}%`),
        ilike(recipe.description, `%${query}%`),
      );
      conditions.push(textSearchCondition);
    }

    // Filtro por duración máxima
    if (maxDuration) {
      conditions.push(sql`${recipe.estimatedTime} <= ${maxDuration}`);
    }

    // Obtener IDs de recetas que coinciden con la categoría si se especifica
    let recipeIdsInCategory: number[] = [];
    if (categoryId) {
      const recipeCategoryResults = await db
        .select({ recipeId: recipeCategories.recipeId })
        .from(recipeCategories)
        .where(eq(recipeCategories.categoryId, categoryId));
      
      recipeIdsInCategory = recipeCategoryResults.map(rc => rc.recipeId).filter((id): id is number => id !== null);
      
      if (recipeIdsInCategory.length === 0) {
        // No hay recetas en esta categoría
        return res.json({
          success: true,
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
      }
    }

    // Obtener IDs de recetas que contienen ingredientes a excluir
    let recipeIdsToExclude: number[] = [];
    if (excludeIngredients) {
      const ingredientsToExclude = excludeIngredients.split(',').map(ing => ing.trim().toLowerCase());
      
      if (ingredientsToExclude.length > 0) {
        const excludedRecipes = await db
          .select({ recipeId: ingredient.recipeId })
          .from(ingredient)
          .where(
            or(
              ...ingredientsToExclude.map(ing => 
                or(
                  ilike(ingredient.name, `%${ing}%`),
                  ilike(ingredient.description, `%${ing}%`)
                )
              )
            )
          );
        
        recipeIdsToExclude = excludedRecipes.map(ir => ir.recipeId).filter((id): id is number => id !== null);
      }
    }

    // Definir el select base
    const selectFields = {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      estimatedTime: recipe.estimatedTime,
      servings: recipe.servings,
      image: recipe.image,
      mediaType: recipe.mediaType,
      userId: recipe.userId,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
    };

    // Construir condiciones finales
    const finalConditions = [];
    
    if (categoryId && recipeIdsInCategory.length > 0) {
      finalConditions.push(sql`${recipe.id} = ANY(${recipeIdsInCategory})`);
    }
    
    if (conditions.length > 0) {
      finalConditions.push(...conditions);
    }

    // Excluir recetas que contienen ingredientes no deseados
    if (recipeIdsToExclude.length > 0) {
      finalConditions.push(sql`${recipe.id} NOT IN (${recipeIdsToExclude})`);
    }

    // Determinar orden
    let orderClause;
    switch (sortBy) {
      case 'newest':
        orderClause = desc(recipe.createdAt);
        break;
      case 'rating':
      case 'popularity':
      case 'relevance':
      default:
        orderClause = desc(recipe.createdAt);
        break;
    }

    // Ejecutar query según las condiciones
    let recipes;
    if (finalConditions.length > 0) {
      recipes = await db
        .select(selectFields)
        .from(recipe)
        .where(and(...finalConditions))
        .orderBy(orderClause)
        .limit(limit)
        .offset(offset);
    } else {
      recipes = await db
        .select(selectFields)
        .from(recipe)
        .orderBy(orderClause)
        .limit(limit)
        .offset(offset);
    }

    // Obtener información adicional para cada receta
    const data = await Promise.all(recipes.map(async (r) => {
      const [ratesResult, likesResult, commentsResult, ingredients, instructions] = await Promise.all([
        db.select({ count: count() }).from(rate).where(eq(rate.recipeId, r.id)),
        db.select({ count: count() }).from(recipeLike).where(eq(recipeLike.recipeId, r.id)),
        db.select({ count: count() }).from(recipeComment).where(eq(recipeComment.recipeId, r.id)),
        db.select().from(ingredient).where(eq(ingredient.recipeId, r.id)),
        db.select().from(instruction).where(eq(instruction.recipeId, r.id)).orderBy(asc(instruction.step)),
      ]);

      let user = null;
      try {
        const clerkUser = await clerkClient.users.getUser(r.userId as string);
        user = {
          id: clerkUser.id,
          username: clerkUser.username,
          email: clerkUser.emailAddresses[0]?.emailAddress,
          imageUrl: clerkUser.imageUrl,
        };
      } catch (error) {
        console.error('Error fetching user:', error);
      }

      return {
        ...r,
        user,
        stats: {
          rates: ratesResult[0]?.count || 0,
          likes: likesResult[0]?.count || 0,
          comments: commentsResult[0]?.count || 0,
        },
        ingredients,
        instructions,
      };
    }));

    // Contar total de resultados para paginación
    let totalCount = 0;
    
    if (categoryId && recipeIdsInCategory.length > 0) {
      if (conditions.length > 0) {
        const countResult = await db
          .select({ count: count() })
          .from(recipe)
          .where(
            and(
              sql`${recipe.id} = ANY(${recipeIdsInCategory})`,
              ...conditions,
              ...(recipeIdsToExclude.length > 0 ? [sql`${recipe.id} NOT IN (${recipeIdsToExclude})`] : []),
            ),
          );
        totalCount = countResult[0]?.count || 0;
      } else {
        totalCount = recipeIdsInCategory.length;
      }
    } else if (conditions.length > 0) {
      const countResult = await db
        .select({ count: count() })
        .from(recipe)
        .where(
          and(
            ...conditions,
            ...(recipeIdsToExclude.length > 0 ? [sql`${recipe.id} NOT IN (${recipeIdsToExclude})`] : []),
          )
        );
      totalCount = countResult[0]?.count || 0;
    } else {
      const countResult = await db.select({ count: count() }).from(recipe);
      totalCount = countResult[0]?.count || 0;
    }

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error searching recipes:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Obtener sugerencias de búsqueda populares
export const getSearchSuggestions = async (req: Request, res: Response) => {
  try {
    const suggestions = await db
      .select({
        id: searchSuggestions.id,
        query: searchSuggestions.query,
        popularity: searchSuggestions.popularity,
      })
      .from(searchSuggestions)
      .where(eq(searchSuggestions.isActive, 'true'))
      .orderBy(desc(searchSuggestions.popularity))
      .limit(8);

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Obtener historial de búsquedas del usuario
export const getUserSearchHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    const history = await db
      .select({
        id: searchHistory.id,
        query: searchHistory.query,
        resultsCount: searchHistory.resultsCount,
        createdAt: searchHistory.createdAt,
      })
      .from(searchHistory)
      .where(eq(searchHistory.userId, userId))
      .orderBy(desc(searchHistory.createdAt))
      .limit(10);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Error fetching search history:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Agregar búsqueda al historial del usuario
export const addToSearchHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const { query, resultsCount } = addToHistoryInput.parse(req.body);

    // Verificar si la consulta ya existe en el historial reciente (últimas 24 horas)
    const existingSearch = await db
      .select()
      .from(searchHistory)
      .where(
        and(
          eq(searchHistory.userId, userId),
          eq(searchHistory.query, query),
          sql`${searchHistory.createdAt} > NOW() - INTERVAL '24 hours'`,
        ),
      )
      .limit(1);

    if (existingSearch.length === 0) {
      // Agregar nueva entrada al historial
      await db.insert(searchHistory).values({
        userId,
        query,
        resultsCount,
      });

      // Actualizar popularidad de la sugerencia o crear nueva
      const existingSuggestion = await db
        .select()
        .from(searchSuggestions)
        .where(eq(searchSuggestions.query, query))
        .limit(1);

      if (existingSuggestion.length > 0) {
        await db
          .update(searchSuggestions)
          .set({
            popularity: sql`${searchSuggestions.popularity} + 1`,
            updatedAt: sql`NOW()`,
          })
          .where(eq(searchSuggestions.id, existingSuggestion[0].id));
      } else {
        await db.insert(searchSuggestions).values({
          query,
          popularity: 1,
        });
      }
    }

    res.json({
      success: true,
      message: 'Búsqueda agregada al historial',
    });
  } catch (error) {
    console.error('Error adding to search history:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Obtener todas las categorías
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categoriesData = await db
      .select({
        id: categories.id,
        name: categories.name,
        displayName: categories.displayName,
        icon: categories.icon,
        color: categories.color,
        recipeCount: count(recipeCategories.recipeId),
      })
      .from(categories)
      .leftJoin(recipeCategories, eq(categories.id, recipeCategories.categoryId))
      .where(eq(categories.isActive, 'true'))
      .groupBy(categories.id, categories.name, categories.displayName, categories.icon, categories.color)
      .orderBy(asc(categories.name));

    res.json({
      success: true,
      data: categoriesData,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Crear nueva categoría (admin)
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, displayName, icon, color } = createCategoryInput.parse(req.body);

    const [newCategory] = await db
      .insert(categories)
      .values({
        name,
        displayName,
        icon,
        color,
      })
      .returning();

    res.json({
      success: true,
      data: newCategory,
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Limpiar historial de búsquedas del usuario
export const clearSearchHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    await db
      .delete(searchHistory)
      .where(eq(searchHistory.userId, userId));

    res.json({
      success: true,
      message: 'Historial de búsquedas eliminado',
    });
  } catch (error) {
    console.error('Error clearing search history:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Eliminar elemento específico del historial
export const removeFromSearchHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const historyId = parseInt(req.params.historyId);

    await db
      .delete(searchHistory)
      .where(
        and(
          eq(searchHistory.id, historyId),
          eq(searchHistory.userId, userId),
        ),
      );

    res.json({
      success: true,
      message: 'Elemento eliminado del historial',
    });
  } catch (error) {
    console.error('Error removing from search history:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Asignar categoría a una receta
export const assignCategoryToRecipe = async (req: Request, res: Response) => {
  try {
    const recipeId = parseInt(req.params.recipeId);
    const categoryId = parseInt(req.params.categoryId);

    // Verificar si ya existe la relación
    const existing = await db
      .select()
      .from(recipeCategories)
      .where(
        and(
          eq(recipeCategories.recipeId, recipeId),
          eq(recipeCategories.categoryId, categoryId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return res.json({
        success: true,
        message: 'La categoría ya está asignada a esta receta',
      });
    }

    const [newAssignment] = await db
      .insert(recipeCategories)
      .values({
        recipeId,
        categoryId,
      })
      .returning();

    res.json({
      success: true,
      data: newAssignment,
      message: 'Categoría asignada exitosamente',
    });
  } catch (error) {
    console.error('Error assigning category to recipe:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

// Remover categoría de una receta
export const removeCategoryFromRecipe = async (req: Request, res: Response) => {
  try {
    const recipeId = parseInt(req.params.recipeId);
    const categoryId = parseInt(req.params.categoryId);

    await db
      .delete(recipeCategories)
      .where(
        and(
          eq(recipeCategories.recipeId, recipeId),
          eq(recipeCategories.categoryId, categoryId),
        ),
      );

    res.json({
      success: true,
      message: 'Categoría removida exitosamente',
    });
  } catch (error) {
    console.error('Error removing category from recipe:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
}; 