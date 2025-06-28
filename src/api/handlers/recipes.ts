import { Request, Response } from 'express';
import { db } from '../../db';
import { ingredient, instruction, rate, recipe } from '../../db/schema';
import { count, eq } from 'drizzle-orm';
import { clerkClient } from '@clerk/express';

export const getAllRecipes = async (req: Request, res: Response) => {
  const recipes = await db.select().from(recipe);
  const data = await Promise.all(recipes.map(async (r) => {
    const rates = await db.select({ count: count() }).from(rate).where(eq(rate.recipeId, r.id));
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
      ingredients: ingredients,
      instructions: instructions,
    };
  }));
  res.json({
    success: true,
    data,
  });
};

export const createRecipe = async (req: Request, res: Response) => {
  const { title, description, estimatedTime, image } = req.body;
  res.json({
    success: true,
    data: recipe,
  });
};