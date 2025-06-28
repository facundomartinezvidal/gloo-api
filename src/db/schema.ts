import { integer, pgTable, text, timestamp, serial } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  externalId: text('external_id').primaryKey(),
  description: text('description'),
  idSocialMedia: text('id_social_media'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
});

export const recipe = pgTable('recipe', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
  title: text('title'),
  description: text('description'),
  estimatedTime: integer('estimated_time'),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
});

export const ingredients = pgTable('ingredients', {
  id: serial('id').primaryKey(),
  recipeId: integer('recipe_id'),
  name: text('name'),
  quantity: integer('quantity'),
  unit: text('unit'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const instructions = pgTable('instructions', {
  id: serial('id').primaryKey(),
  recipeId: integer('recipe_id'),
  step: integer('step'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const rates = pgTable('rates', {
  id: serial('id').primaryKey(),
  recipeId: integer('recipe_id'),
  userId: text('user_id'),
  rate: integer('rate'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  recipes: many(recipe),
  rates: many(rates),
}));

export const recipeRelations = relations(recipe, ({ one, many }) => ({
  user: one(users, {
    fields: [recipe.userId],
    references: [users.externalId],
  }),
  ingredients: many(ingredients),
  instructions: many(instructions),
  rates: many(rates),
}));

export const ingredientsRelations = relations(ingredients, ({ one }) => ({
  recipe: one(recipe, {
    fields: [ingredients.recipeId],
    references: [recipe.id],
  }),
}));

export const instructionsRelations = relations(instructions, ({ one }) => ({
  recipe: one(recipe, {
    fields: [instructions.recipeId],
    references: [recipe.id],
  }),
}));

export const ratesRelations = relations(rates, ({ one }) => ({
  recipe: one(recipe, {
    fields: [rates.recipeId],
    references: [recipe.id],
  }),
  user: one(users, {
    fields: [rates.userId],
    references: [users.externalId],
  }),
}));
