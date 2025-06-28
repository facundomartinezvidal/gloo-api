import { Request, Response } from 'express';
import { db } from '../../db';
import { ingredient } from '../../db/schema';
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