import { Request, Response } from 'express';
import { db } from '../../db';
import { follow, users } from '../../db/schema';
import { eq, and, count } from 'drizzle-orm';
import { clerkClient } from '@clerk/express';
import { followUserInput, unfollowUserInput } from '../inputs/follows';
import { createFollowNotification } from './notifications';

export const followUser = async (req: Request, res: Response) => {
  try {
    const { followingId } = followUserInput.parse(req.body);
    const followerId = req.params.userId;

    console.log('🔎 FollowerId recibido:', followerId);
    console.log('🔎 FollowingId recibido:', followingId);

    // Verificar que el usuario no se siga a sí mismo
    if (followerId === followingId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot follow yourself',
      });
    }

    // Función auxiliar para crear usuario si no existe
    const ensureUserExists = async (userId: string) => {
      const existingUser = await db.select()
        .from(users)
        .where(eq(users.externalId, userId))
        .limit(1);

      if (existingUser.length === 0) {
        console.log(`🔧 Creating user in DB for ${userId}`);
        try {
          // Intentar obtener datos del usuario desde Clerk
          const clerkUser = await clerkClient.users.getUser(userId);
          console.log(`🔧 User data from Clerk for ${userId}:`, {
            id: clerkUser.id,
            username: clerkUser.username,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName
          });
        } catch (clerkError) {
          console.log(`🔧 Could not get user from Clerk for ${userId}:`, clerkError);
        }

        // Crear usuario en la base de datos
        await db.insert(users).values({
          externalId: userId,
          description: null,
          idSocialMedia: null,
          createdBy: userId,
        });
        console.log(`🔧 User created in DB for ${userId}`);
        return true;
      }
      return false;
    };

    // Verificar que ambos usuarios existan, creándolos si es necesario
    const [followerCreated, followingCreated] = await Promise.all([
      ensureUserExists(followerId),
      ensureUserExists(followingId),
    ]);

    console.log(`🔧 Follower created: ${followerCreated}, Following created: ${followingCreated}`);

    // Verificar que ambos usuarios existan después de la creación
    const [followerExists, followingExists] = await Promise.all([
      db.select().from(users).where(eq(users.externalId, followerId)).limit(1),
      db.select().from(users).where(eq(users.externalId, followingId)).limit(1),
    ]);

    console.log('🔎 Resultado followerExists:', followerExists);
    console.log('🔎 Resultado followingExists:', followingExists);

    if (followerExists.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Follower user not found',
      });
    }

    if (followingExists.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User to follow not found',
      });
    }

    // Verificar si ya existe la relación
    const existingFollow = await db.select()
      .from(follow)
      .where(and(
        eq(follow.followerId, followerId),
        eq(follow.followingId, followingId),
      ))
      .limit(1);

    if (existingFollow.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Already following this user',
      });
    }

    // Crear la relación de follow
    const newFollow = await db.insert(follow).values({
      followerId,
      followingId,
    }).returning();

    // Crear notificación para el usuario seguido
    await createFollowNotification(followerId, followingId);

    res.json({
      success: true,
      data: newFollow[0],
      message: 'Successfully followed user',
    });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const unfollowUser = async (req: Request, res: Response) => {
  try {
    const { followingId } = unfollowUserInput.parse(req.body);
    const followerId = req.params.userId;

    console.log('🔎 Unfollow - FollowerId recibido:', followerId);
    console.log('🔎 Unfollow - FollowingId recibido:', followingId);

    // Verificar que el usuario no se desiga a sí mismo
    if (followerId === followingId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot unfollow yourself',
      });
    }

    // Función auxiliar para crear usuario si no existe
    const ensureUserExists = async (userId: string) => {
      const existingUser = await db.select()
        .from(users)
        .where(eq(users.externalId, userId))
        .limit(1);

      if (existingUser.length === 0) {
        console.log(`🔧 Creating user in DB for unfollow operation: ${userId}`);
        await db.insert(users).values({
          externalId: userId,
          description: null,
          idSocialMedia: null,
          createdBy: userId,
        });
        return true;
      }
      return false;
    };

    // Verificar que ambos usuarios existan, creándolos si es necesario
    await Promise.all([
      ensureUserExists(followerId),
      ensureUserExists(followingId),
    ]);

    // Verificar si existe la relación
    const existingFollow = await db.select()
      .from(follow)
      .where(and(
        eq(follow.followerId, followerId),
        eq(follow.followingId, followingId),
      ))
      .limit(1);

    if (existingFollow.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not following this user',
      });
    }

    // Eliminar la relación de follow
    await db.delete(follow)
      .where(and(
        eq(follow.followerId, followerId),
        eq(follow.followingId, followingId),
      ));

    res.json({
      success: true,
      message: 'Successfully unfollowed user',
    });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getFollowers = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    // Obtener todos los seguidores con información adicional de la tabla users
    const followers = await db.select({
      id: follow.id,
      followerId: follow.followerId,
      createdAt: follow.createdAt,
      userDescription: users.description,
      userIdSocialMedia: users.idSocialMedia,
      userCreatedAt: users.createdAt,
    })
      .from(follow)
      .leftJoin(users, eq(follow.followerId, users.externalId))
      .where(eq(follow.followingId, userId));

    // Obtener información de cada seguidor desde Clerk y combinar con datos de la tabla users
    const followersWithInfo = await Promise.all(
      followers.map(async (follower) => {
        try {
          const clerkUser = await clerkClient.users.getUser(follower.followerId);
          return {
            id: follower.id,
            followerId: follower.followerId,
            createdAt: follower.createdAt,
            user: {
              id: clerkUser.id,
              username: clerkUser.username,
              email: clerkUser.emailAddresses[0]?.emailAddress,
              imageUrl: clerkUser.imageUrl,
              firstName: clerkUser.firstName,
              lastName: clerkUser.lastName,
              // Datos adicionales de la tabla users
              description: follower.userDescription,
              idSocialMedia: follower.userIdSocialMedia,
              profileCreatedAt: follower.userCreatedAt,
            },
          };
        } catch (error) {
          console.error(`Error getting user info for ${follower.followerId}:`, error);
          return {
            id: follower.id,
            followerId: follower.followerId,
            createdAt: follower.createdAt,
            user: null,
          };
        }
      }),
    );

    // Contar total de seguidores
    const totalFollowers = await db.select({ count: count() })
      .from(follow)
      .where(eq(follow.followingId, userId));

    res.json({
      success: true,
      data: {
        followers: followersWithInfo,
        total: totalFollowers[0].count,
      },
    });
  } catch (error) {
    console.error('Error getting followers:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getFollowing = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    // Obtener todos los usuarios que sigue con información adicional de la tabla users
    const following = await db.select({
      id: follow.id,
      followingId: follow.followingId,
      createdAt: follow.createdAt,
      userDescription: users.description,
      userIdSocialMedia: users.idSocialMedia,
      userCreatedAt: users.createdAt,
    })
      .from(follow)
      .leftJoin(users, eq(follow.followingId, users.externalId))
      .where(eq(follow.followerId, userId));

    // Obtener información de cada usuario seguido desde Clerk y combinar con datos de la tabla users
    const followingWithInfo = await Promise.all(
      following.map(async (followingUser) => {
        try {
          const clerkUser = await clerkClient.users.getUser(followingUser.followingId);
          return {
            id: followingUser.id,
            followingId: followingUser.followingId,
            createdAt: followingUser.createdAt,
            user: {
              id: clerkUser.id,
              username: clerkUser.username,
              email: clerkUser.emailAddresses[0]?.emailAddress,
              imageUrl: clerkUser.imageUrl,
              firstName: clerkUser.firstName,
              lastName: clerkUser.lastName,
              // Datos adicionales de la tabla users
              description: followingUser.userDescription,
              idSocialMedia: followingUser.userIdSocialMedia,
              profileCreatedAt: followingUser.userCreatedAt,
            },
          };
        } catch (error) {
          console.error(`Error getting user info for ${followingUser.followingId}:`, error);
          return {
            id: followingUser.id,
            followingId: followingUser.followingId,
            createdAt: followingUser.createdAt,
            user: null,
          };
        }
      }),
    );

    // Contar total de seguidos
    const totalFollowing = await db.select({ count: count() })
      .from(follow)
      .where(eq(follow.followerId, userId));

    res.json({
      success: true,
      data: {
        following: followingWithInfo,
        total: totalFollowing[0].count,
      },
    });
  } catch (error) {
    console.error('Error getting following:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getFollowStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const { targetUserId } = req.query;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Target user ID is required',
      });
    }

    // Verificar si userId sigue a targetUserId
    const isFollowing = await db.select()
      .from(follow)
      .where(and(
        eq(follow.followerId, userId),
        eq(follow.followingId, targetUserId),
      ))
      .limit(1);

    // Verificar si targetUserId sigue a userId
    const isFollowedBy = await db.select()
      .from(follow)
      .where(and(
        eq(follow.followerId, targetUserId),
        eq(follow.followingId, userId),
      ))
      .limit(1);

    res.json({
      success: true,
      data: {
        isFollowing: isFollowing.length > 0,
        isFollowedBy: isFollowedBy.length > 0,
      },
    });
  } catch (error) {
    console.error('Error getting follow status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getUserStats = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    // Contar seguidores y seguidos
    const [followersCount, followingCount] = await Promise.all([
      db.select({ count: count() })
        .from(follow)
        .where(eq(follow.followingId, userId)),
      db.select({ count: count() })
        .from(follow)
        .where(eq(follow.followerId, userId)),
    ]);

    res.json({
      success: true,
      data: {
        followersCount: followersCount[0].count,
        followingCount: followingCount[0].count,
      },
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}; 