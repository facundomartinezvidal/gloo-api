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
  servings: integer('servings'),
  image: text('image'),
  mediaType: text('media_type'),
  status: text('status').default('pending'), // 'pending', 'approved', 'rejected', 'pending_delete'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
});

export const ingredient = pgTable('ingredients', {
  id: serial('id').primaryKey(),
  recipeId: integer('recipe_id'),
  name: text('name'),
  quantity: integer('quantity'),
  unit: text('unit'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const instruction = pgTable('instructions', {
  id: serial('id').primaryKey(),
  recipeId: integer('recipe_id'),
  step: integer('step'),
  description: text('description'),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const rate = pgTable('rates', {
  id: serial('id').primaryKey(),
  recipeId: integer('recipe_id'),
  userId: text('user_id'),
  rate: integer('rate'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow(),
});

export const follow = pgTable('follows', {
  id: serial('id').primaryKey(),
  followerId: text('follower_id').notNull(),
  followingId: text('following_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const recipeLike = pgTable('recipe_likes', {
  id: serial('id').primaryKey(),
  recipeId: integer('recipe_id').notNull(),
  userId: text('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const recipeComment = pgTable('recipe_comments', {
  id: serial('id').primaryKey(),
  recipeId: integer('recipe_id').notNull(),
  userId: text('user_id').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const notification = pgTable('notifications', {
  id: serial('id').primaryKey(),
  recipientId: text('recipient_id').notNull(),
  senderId: text('sender_id'),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  relatedId: integer('related_id'),
  relatedType: text('related_type'),
  read: text('read').default('false'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Nuevas tablas para funcionalidad de búsqueda
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  displayName: text('display_name').notNull(),
  icon: text('icon'),
  color: text('color'),
  isActive: text('is_active').default('true'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const recipeCategories = pgTable('recipe_categories', {
  id: serial('id').primaryKey(),
  recipeId: integer('recipe_id').notNull(),
  categoryId: integer('category_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const searchHistory = pgTable('search_history', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  query: text('query').notNull(),
  resultsCount: integer('results_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const searchSuggestions = pgTable('search_suggestions', {
  id: serial('id').primaryKey(),
  query: text('query').notNull(),
  popularity: integer('popularity').default(1),
  isActive: text('is_active').default('true'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Nuevas tablas para funcionalidad de colecciones
export const collections = pgTable('collections', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  color: text('color'),
  isPublic: text('is_public').default('false'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const collectionRecipes = pgTable('collection_recipes', {
  id: serial('id').primaryKey(),
  collectionId: integer('collection_id').notNull(),
  recipeId: integer('recipe_id').notNull(),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow(),
});

// Tabla de favoritos
export const favorites = pgTable('favorites', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  recipeId: integer('recipe_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  recipes: many(recipe),
  rates: many(rate),
  followers: many(follow, { relationName: 'following' }),
  following: many(follow, { relationName: 'follower' }),
  recipeLikes: many(recipeLike),
  recipeComments: many(recipeComment),
  sentNotifications: many(notification, { relationName: 'sender' }),
  receivedNotifications: many(notification, { relationName: 'recipient' }),
  searchHistory: many(searchHistory),
  collections: many(collections),
  favorites: many(favorites),
}));

export const recipeRelations = relations(recipe, ({ one, many }) => ({
  user: one(users, {
    fields: [recipe.userId],
    references: [users.externalId],
  }),
  ingredients: many(ingredient),
  instructions: many(instruction),
  rates: many(rate),
  likes: many(recipeLike),
  comments: many(recipeComment),
  categories: many(recipeCategories),
  collectionRecipes: many(collectionRecipes),
  favorites: many(favorites),
}));

export const ingredientsRelations = relations(ingredient, ({ one }) => ({
  recipe: one(recipe, {
    fields: [ingredient.recipeId],
    references: [recipe.id],
  }),
}));

export const instructionsRelations = relations(instruction, ({ one }) => ({
  recipe: one(recipe, {
    fields: [instruction.recipeId],
    references: [recipe.id],
  }),
}));

export const ratesRelations = relations(rate, ({ one }) => ({
  recipe: one(recipe, {
    fields: [rate.recipeId],
    references: [recipe.id],
  }),
  user: one(users, {
    fields: [rate.userId],
    references: [users.externalId],
  }),
}));

export const followsRelations = relations(follow, ({ one }) => ({
  follower: one(users, {
    fields: [follow.followerId],
    references: [users.externalId],
    relationName: 'follower',
  }),
  following: one(users, {
    fields: [follow.followingId],
    references: [users.externalId],
    relationName: 'following',
  }),
}));

export const recipeLikesRelations = relations(recipeLike, ({ one }) => ({
  recipe: one(recipe, {
    fields: [recipeLike.recipeId],
    references: [recipe.id],
  }),
  user: one(users, {
    fields: [recipeLike.userId],
    references: [users.externalId],
  }),
}));

export const recipeCommentsRelations = relations(recipeComment, ({ one }) => ({
  recipe: one(recipe, {
    fields: [recipeComment.recipeId],
    references: [recipe.id],
  }),
  user: one(users, {
    fields: [recipeComment.userId],
    references: [users.externalId],
  }),
}));

export const notificationsRelations = relations(notification, ({ one }) => ({
  recipient: one(users, {
    fields: [notification.recipientId],
    references: [users.externalId],
    relationName: 'recipient',
  }),
  sender: one(users, {
    fields: [notification.senderId],
    references: [users.externalId],
    relationName: 'sender',
  }),
}));

// Relaciones para las nuevas tablas de búsqueda
export const categoriesRelations = relations(categories, ({ many }) => ({
  recipeCategories: many(recipeCategories),
}));

export const recipeCategoriesRelations = relations(recipeCategories, ({ one }) => ({
  recipe: one(recipe, {
    fields: [recipeCategories.recipeId],
    references: [recipe.id],
  }),
  category: one(categories, {
    fields: [recipeCategories.categoryId],
    references: [categories.id],
  }),
}));

export const searchHistoryRelations = relations(searchHistory, ({ one }) => ({
  user: one(users, {
    fields: [searchHistory.userId],
    references: [users.externalId],
  }),
}));

// Relaciones para las nuevas tablas de colecciones
export const collectionsRelations = relations(collections, ({ one, many }) => ({
  user: one(users, {
    fields: [collections.userId],
    references: [users.externalId],
  }),
  collectionRecipes: many(collectionRecipes),
}));

export const collectionRecipesRelations = relations(collectionRecipes, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionRecipes.collectionId],
    references: [collections.id],
  }),
  recipe: one(recipe, {
    fields: [collectionRecipes.recipeId],
    references: [recipe.id],
  }),
}));

// Relaciones para favoritos
export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.externalId],
  }),
  recipe: one(recipe, {
    fields: [favorites.recipeId],
    references: [recipe.id],
  }),
}));
