import { Request, Response } from 'express';
import { db } from '../../db';
import { recipeComment, recipe, users, notification } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { clerkClient } from '@clerk/express';
import { createCommentInput, updateCommentInput, getCommentsInput } from '../inputs/comments';

// Función auxiliar para crear notificación de comentario
const createCommentNotification = async (commenterUserId: string, recipeOwnerId: string, recipeId: number, recipeTitle: string) => {
  if (commenterUserId === recipeOwnerId) return; // No notificar si es el mismo usuario

  try {
    const commenterUser = await clerkClient.users.getUser(commenterUserId);
    const commenterName = commenterUser.username || commenterUser.firstName || 'Alguien';
    
    await db.insert(notification).values({
      recipientId: recipeOwnerId,
      senderId: commenterUserId,
      type: 'comment',
      title: 'Nuevo comentario',
      message: `${commenterName} comentó en tu receta "${recipeTitle}"`,
      relatedId: recipeId,
      relatedType: 'recipe',
    });
  } catch (error) {
    console.error('Error creating comment notification:', error);
  }
};

export const createComment = async (req: Request, res: Response) => {
  try {
    const { recipeId, content } = createCommentInput.parse(req.body);
    const userId = req.params.userId;

    // Verificar que la receta existe
    const recipeExists = await db.select()
      .from(recipe)
      .where(eq(recipe.id, recipeId))
      .limit(1);

    if (recipeExists.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found',
      });
    }

    // Verificar que el usuario existe
    const userExists = await db.select()
      .from(users)
      .where(eq(users.externalId, userId))
      .limit(1);

    if (userExists.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Crear el comentario
    const newComment = await db.insert(recipeComment).values({
      recipeId,
      userId,
      content,
    }).returning();

    // Crear notificación para el dueño de la receta
    await createCommentNotification(userId, recipeExists[0].userId!, recipeId, recipeExists[0].title!);

    // Obtener información del usuario que comentó
    try {
      const user = await clerkClient.users.getUser(userId);
      const commentWithUser = {
        ...newComment[0],
        user: {
          id: user.id,
          username: user.username,
          email: user.emailAddresses[0]?.emailAddress,
          imageUrl: user.imageUrl,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      };

      res.json({
        success: true,
        data: commentWithUser,
        message: 'Comment created successfully',
      });
    } catch (error) {
      res.json({
        success: true,
        data: newComment[0],
        message: 'Comment created successfully',
      });
    }
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getComments = async (req: Request, res: Response) => {
  try {
    const recipeId = parseInt(req.params.recipeId);
    const { page = 1, limit = 20 } = getCommentsInput.parse(req.query);

    if (isNaN(recipeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipe ID',
      });
    }

    const offset = (page - 1) * limit;

    // Obtener comentarios con paginación
    const comments = await db.select({
      id: recipeComment.id,
      recipeId: recipeComment.recipeId,
      userId: recipeComment.userId,
      content: recipeComment.content,
      createdAt: recipeComment.createdAt,
      updatedAt: recipeComment.updatedAt,
    })
      .from(recipeComment)
      .where(eq(recipeComment.recipeId, recipeId))
      .orderBy(desc(recipeComment.createdAt))
      .limit(limit)
      .offset(offset);

    // Obtener información de los usuarios que comentaron
    const commentsWithUserInfo = await Promise.all(
      comments.map(async (comment) => {
        try {
          console.log(`Fetching user info for userId: ${comment.userId}`);
          const user = await clerkClient.users.getUser(comment.userId);
          console.log(`User data retrieved for ${comment.userId}:`, {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.emailAddresses[0]?.emailAddress
          });
          
          return {
            ...comment,
            user: {
              id: user.id,
              username: user.username,
              email: user.emailAddresses[0]?.emailAddress,
              imageUrl: user.imageUrl,
              firstName: user.firstName,
              lastName: user.lastName,
            },
          };
        } catch (error) {
          console.error(`Error getting user info from Clerk for ${comment.userId}:`, error);
          
          // Fallback: Intentar obtener información básica del usuario desde la base de datos
          try {
            console.log(`Trying to get user from DB for ${comment.userId}`);
            const dbUser = await db.select()
              .from(users)
              .where(eq(users.externalId, comment.userId))
              .limit(1);
            
            if (dbUser.length > 0) {
              console.log(`Found user in DB for ${comment.userId}:`, dbUser[0]);
              return {
                ...comment,
                user: {
                  id: comment.userId,
                  username: dbUser[0].username || 'Usuario',
                  email: dbUser[0].email,
                  imageUrl: dbUser[0].imageUrl,
                  firstName: dbUser[0].firstName,
                  lastName: dbUser[0].lastName,
                },
              };
            } else {
              console.log(`No user found in DB for ${comment.userId}`);
            }
          } catch (dbError) {
            console.error(`Error getting user from DB for ${comment.userId}:`, dbError);
          }
          
          // Último fallback: usuario genérico
          console.log(`Using fallback user data for ${comment.userId}`);
          return {
            ...comment,
            user: {
              id: comment.userId,
              username: 'Usuario',
              email: null,
              imageUrl: null,
              firstName: null,
              lastName: null,
            },
          };
        }
      }),
    );

    // Contar total de comentarios
    const totalComments = await db.select({ count: recipeComment.id })
      .from(recipeComment)
      .where(eq(recipeComment.recipeId, recipeId));

    res.json({
      success: true,
      data: {
        comments: commentsWithUserInfo,
        pagination: {
          page,
          limit,
          total: totalComments.length,
          totalPages: Math.ceil(totalComments.length / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error getting comments:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const updateComment = async (req: Request, res: Response) => {
  try {
    const { content } = updateCommentInput.parse(req.body);
    const commentId = parseInt(req.params.commentId);
    const userId = req.params.userId;

    if (isNaN(commentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid comment ID',
      });
    }

    // Verificar que el comentario existe y pertenece al usuario
    const existingComment = await db.select()
      .from(recipeComment)
      .where(and(
        eq(recipeComment.id, commentId),
        eq(recipeComment.userId, userId),
      ))
      .limit(1);

    if (existingComment.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found or you are not authorized to update it',
      });
    }

    // Actualizar el comentario
    const updatedComment = await db.update(recipeComment)
      .set({ 
        content,
        updatedAt: new Date(),
      })
      .where(eq(recipeComment.id, commentId))
      .returning();

    res.json({
      success: true,
      data: updatedComment[0],
      message: 'Comment updated successfully',
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    const commentId = parseInt(req.params.commentId);
    const userId = req.params.userId;

    if (isNaN(commentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid comment ID',
      });
    }

    // Verificar que el comentario existe y pertenece al usuario
    const existingComment = await db.select()
      .from(recipeComment)
      .where(and(
        eq(recipeComment.id, commentId),
        eq(recipeComment.userId, userId),
      ))
      .limit(1);

    if (existingComment.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found or you are not authorized to delete it',
      });
    }

    // Eliminar el comentario
    await db.delete(recipeComment)
      .where(eq(recipeComment.id, commentId));

    res.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}; 