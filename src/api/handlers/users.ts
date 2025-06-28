import { Request, Response } from 'express';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { clerkClient } from '@clerk/express';
import { updateUserInput, getUserInput } from '../inputs/users';

export const getUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    // Obtener datos del usuario desde Clerk
    const clerkUser = await clerkClient.users.getUser(userId);

    // Obtener datos adicionales de la tabla users
    const dbUser = await db.select()
      .from(users)
      .where(eq(users.externalId, userId))
      .limit(1);

    const userData = {
      // Datos de Clerk
      id: clerkUser.id,
      username: clerkUser.username,
      email: clerkUser.emailAddresses[0]?.emailAddress,
      imageUrl: clerkUser.imageUrl,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      // Datos de la tabla users
      description: dbUser[0]?.description || null,
      idSocialMedia: dbUser[0]?.idSocialMedia || null,
      profileCreatedAt: dbUser[0]?.createdAt || null,
      profileUpdatedAt: dbUser[0]?.updatedAt || null,
    };

    res.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const updateData = updateUserInput.parse(req.body);

    // Separar datos para Clerk y para la tabla users
    const clerkData: any = {};
    const dbData: any = {};

    // Datos para Clerk
    if (updateData.firstName !== undefined) clerkData.firstName = updateData.firstName;
    if (updateData.lastName !== undefined) clerkData.lastName = updateData.lastName;
    if (updateData.username !== undefined) clerkData.username = updateData.username;

    // Datos para la tabla users
    if (updateData.description !== undefined) dbData.description = updateData.description;
    if (updateData.idSocialMedia !== undefined) dbData.idSocialMedia = updateData.idSocialMedia;

    // Actualizar datos en Clerk si hay cambios
    if (Object.keys(clerkData).length > 0) {
      try {
        await clerkClient.users.updateUser(userId, clerkData);
      } catch (error) {
        console.error('Error updating Clerk user:', error);
        return res.status(400).json({
          success: false,
          error: 'Error updating user profile in Clerk',
        });
      }
    }

    // Actualizar datos en la tabla users si hay cambios
    if (Object.keys(dbData).length > 0) {
      // Agregar campos de auditoría
      dbData.updatedAt = new Date();
      dbData.updatedBy = userId;

      // Verificar si el usuario existe en la tabla
      const existingUser = await db.select()
        .from(users)
        .where(eq(users.externalId, userId))
        .limit(1);

      if (existingUser.length === 0) {
        // Si no existe, crear el registro
        await db.insert(users).values({
          externalId: userId,
          ...dbData,
          createdBy: userId,
        });
      } else {
        // Si existe, actualizar
        await db.update(users)
          .set(dbData)
          .where(eq(users.externalId, userId));
      }
    }

    // Obtener datos actualizados para la respuesta
    const updatedClerkUser = await clerkClient.users.getUser(userId);
    const updatedDbUser = await db.select()
      .from(users)
      .where(eq(users.externalId, userId))
      .limit(1);

    const updatedUserData = {
      // Datos de Clerk
      id: updatedClerkUser.id,
      username: updatedClerkUser.username,
      email: updatedClerkUser.emailAddresses[0]?.emailAddress,
      imageUrl: updatedClerkUser.imageUrl,
      firstName: updatedClerkUser.firstName,
      lastName: updatedClerkUser.lastName,
      // Datos de la tabla users
      description: updatedDbUser[0]?.description || null,
      idSocialMedia: updatedDbUser[0]?.idSocialMedia || null,
      profileCreatedAt: updatedDbUser[0]?.createdAt || null,
      profileUpdatedAt: updatedDbUser[0]?.updatedAt || null,
    };

    res.json({
      success: true,
      data: updatedUserData,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}; 