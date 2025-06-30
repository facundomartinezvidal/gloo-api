import { Request, Response } from 'express';
import { db } from '../../db';
import { recipeComment, recipe, users, notification } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createCommentInput, updateCommentInput } from '../inputs/comments';
import { clerkClient } from '@clerk/express';

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

    // Intentar obtener datos del usuario desde Clerk y guardarlos en la tabla users
    let userData = null;
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      userData = {
        id: clerkUser.id,
        username: clerkUser.username,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        imageUrl: clerkUser.imageUrl,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      };

      // Guardar o actualizar datos del usuario en la tabla users
      const existingUser = await db.select()
        .from(users)
        .where(eq(users.externalId, userId))
        .limit(1);

      if (existingUser.length === 0) {
        // Crear nuevo usuario en la tabla
        await db.insert(users).values({
          externalId: userId,
          description: null,
          idSocialMedia: null,
          createdBy: userId,
        });
      }
    } catch (error) {
      console.error('Error getting user from Clerk:', error);
      // Si no podemos obtener datos de Clerk, continuamos sin ellos
    }

    // Crear el comentario
    const newComment = await db.insert(recipeComment).values({
      recipeId,
      userId,
      content,
    }).returning();

    // Crear notificación para el dueño de la receta
    await createCommentNotification(userId, recipeExists[0].userId!, recipeId, recipeExists[0].title!);

    // Preparar respuesta con datos del usuario
    const commentWithUser = {
      ...newComment[0],
      user: userData || {
        id: userId,
        username: 'Usuario',
        email: null,
        imageUrl: null,
        firstName: null,
        lastName: null,
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

    // Obtener información de los usuarios que comentaron
    const commentsWithUserInfo = await Promise.all(
      comments.map(async (comment) => {
        try {
          // Primero intentar obtener datos del usuario desde la tabla users
          console.log(`Trying to get user from DB for ${comment.userId}`);
          const dbUser = await db.select()
            .from(users)
            .where(eq(users.externalId, comment.userId))
            .limit(1);
          
          if (dbUser.length > 0) {
            console.log(`Found user in DB for ${comment.userId}:`, dbUser[0]);
            
            // Intentar obtener datos adicionales de Clerk si está disponible
            try {
              const clerkUser = await clerkClient.users.getUser(comment.userId);
              return {
                ...comment,
                user: {
                  id: comment.userId,
                  username: clerkUser.username || 'Usuario',
                  email: clerkUser.emailAddresses[0]?.emailAddress,
                  imageUrl: clerkUser.imageUrl,
                  firstName: clerkUser.firstName,
                  lastName: clerkUser.lastName,
                },
              };
            } catch (clerkError) {
              console.log(`Clerk not available for ${comment.userId}, using DB data only`);
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
          } else {
            console.log(`No user found in DB for ${comment.userId}, trying Clerk`);
            
            // Si no está en la DB, intentar con Clerk
            try {
              const clerkUser = await clerkClient.users.getUser(comment.userId);
              console.log(`User data retrieved from Clerk for ${comment.userId}:`, {
                id: clerkUser.id,
                username: clerkUser.username,
                firstName: clerkUser.firstName,
                lastName: clerkUser.lastName,
                email: clerkUser.emailAddresses[0]?.emailAddress,
              });
              
              // Guardar usuario en la DB para futuras consultas
              await db.insert(users).values({
                externalId: comment.userId,
                description: null,
                idSocialMedia: null,
                createdBy: comment.userId,
              });
              
              return {
                ...comment,
                user: {
                  id: comment.userId,
                  username: clerkUser.username || 'Usuario',
                  email: clerkUser.emailAddresses[0]?.emailAddress,
                  imageUrl: clerkUser.imageUrl,
                  firstName: clerkUser.firstName,
                  lastName: clerkUser.lastName,
                },
              };
            } catch (clerkError) {
              console.error(`Error getting user from Clerk for ${comment.userId}:`, clerkError);
              
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
          }
        } catch (error) {
          console.error(`Error processing user data for ${comment.userId}:`, error);
          
          // Fallback final
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