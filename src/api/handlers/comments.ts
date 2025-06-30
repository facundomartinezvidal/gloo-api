import { Request, Response } from 'express';
import { db } from '../../db';
import { recipeComment, recipe, users, notification } from '../../db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { createCommentInput, updateCommentInput } from '../inputs/comments';

// Función auxiliar para crear notificación de comentario
const createCommentNotification = async (commenterUserId: string, recipeOwnerId: string, recipeId: number, recipeTitle: string) => {
  if (commenterUserId === recipeOwnerId) return; // No notificar si es el mismo usuario

  try {
    const commenterUser = await db.select()
      .from(users)
      .where(eq(users.externalId, commenterUserId))
      .limit(1);
    
    const commenterName = commenterUser[0]?.idSocialMedia || 'Alguien';
    
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
    const commentWithUser = {
      ...newComment[0],
      user: {
        id: userExists[0].externalId,
        username: userExists[0].idSocialMedia,
        description: userExists[0].description,
      },
    };

    res.json({
      success: true,
      data: commentWithUser,
      message: 'Comment created successfully',
    });
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (isNaN(recipeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipe ID',
      });
    }

    const offset = (page - 1) * limit;

    // Obtener comentarios con información del usuario
    const comments = await db.select({
      id: recipeComment.id,
      recipeId: recipeComment.recipeId,
      userId: recipeComment.userId,
      content: recipeComment.content,
      createdAt: recipeComment.createdAt,
      updatedAt: recipeComment.updatedAt,
      userUsername: users.idSocialMedia,
      userDescription: users.description,
    })
      .from(recipeComment)
      .leftJoin(users, eq(recipeComment.userId, users.externalId))
      .where(eq(recipeComment.recipeId, recipeId))
      .orderBy(desc(recipeComment.createdAt))
      .limit(limit)
      .offset(offset);

    // Formatear respuesta con información del usuario
    const commentsWithUserInfo = comments.map((comment) => ({
      id: comment.id,
      recipeId: comment.recipeId,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: {
        id: comment.userId,
        username: comment.userUsername,
        description: comment.userDescription,
      },
    }));

    // Contar total de comentarios
    const totalCommentsResult = await db.select({ count: count() })
      .from(recipeComment)
      .where(eq(recipeComment.recipeId, recipeId));

    const totalComments = totalCommentsResult[0]?.count || 0;

    res.json({
      success: true,
      data: {
        comments: commentsWithUserInfo,
        pagination: {
          page,
          limit,
          total: totalComments,
          totalPages: Math.ceil(totalComments / limit),
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
        eq(recipeComment.userId, userId)
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
        updatedAt: new Date()
      })
      .where(eq(recipeComment.id, commentId))
      .returning();

    // Obtener información del usuario
    const user = await db.select()
      .from(users)
      .where(eq(users.externalId, userId))
      .limit(1);

    const commentWithUser = {
      ...updatedComment[0],
      user: {
        id: user[0]?.externalId,
        username: user[0]?.idSocialMedia,
        description: user[0]?.description,
      },
    };

    res.json({
      success: true,
      data: commentWithUser,
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
        eq(recipeComment.userId, userId)
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