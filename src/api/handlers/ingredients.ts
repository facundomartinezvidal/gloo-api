import { Request, Response } from 'express';
import { db } from '../../db';
import { ingredient } from '../../db/schema';
import { eq } from 'drizzle-orm';
import createIngredientsInput from '../inputs/ingredients';

export const createIngredient = async (req: Request, res: Response) => {
  try {
    const { ingredients } = createIngredientsInput.parse(req.body);
    const recipeId = parseInt(req.params.recipeId);

    // Validate that recipeId is a valid number
    if (isNaN(recipeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipe ID',
      });
    }

    // Prepare ingredients data with recipeId
    const ingredientsToInsert = ingredients.map(ing => ({
      recipeId,
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      description: ing.description || null,
    }));

    // Insert all ingredients
    const newIngredients = await db
      .insert(ingredient)
      .values(ingredientsToInsert)
      .returning();

    res.json({
      success: true,
      data: newIngredients,
      message: `${newIngredients.length} ingredient(s) created successfully`,
    });
  } catch (error) {
    console.error('Error creating ingredients:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const updateIngredient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, quantity, unit, description } = req.body;
    
    const ingredientId = parseInt(id);
    if (isNaN(ingredientId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de ingrediente inválido',
      });
    }

    // Verificar si el ingrediente existe
    const existingIngredient = await db.select().from(ingredient).where(eq(ingredient.id, ingredientId));
    if (existingIngredient.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ingrediente no encontrado',
      });
    }

    // Actualizar el ingrediente
    const updatedIngredient = await db
      .update(ingredient)
      .set({
        name: name || existingIngredient[0].name,
        quantity: quantity !== undefined ? quantity : existingIngredient[0].quantity,
        unit: unit || existingIngredient[0].unit,
        description: description !== undefined ? description : existingIngredient[0].description,
        updatedAt: new Date(),
      })
      .where(eq(ingredient.id, ingredientId))
      .returning();

    res.json({
      success: true,
      data: updatedIngredient[0],
      message: 'Ingrediente actualizado exitosamente',
    });
  } catch (error) {
    console.error('Error updating ingredient:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};

export const deleteIngredient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const ingredientId = parseInt(id);
    if (isNaN(ingredientId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de ingrediente inválido',
      });
    }

    // Verificar si el ingrediente existe
    const existingIngredient = await db.select().from(ingredient).where(eq(ingredient.id, ingredientId));
    if (existingIngredient.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ingrediente no encontrado',
      });
    }

    // Eliminar el ingrediente
    await db.delete(ingredient).where(eq(ingredient.id, ingredientId));

    res.json({
      success: true,
      message: 'Ingrediente eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
}; 