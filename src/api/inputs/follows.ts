import { z } from 'zod';

export const followUserInput = z.object({
  followingId: z.string().min(1, 'User ID to follow is required'),
});

export const unfollowUserInput = z.object({
  followingId: z.string().min(1, 'User ID to unfollow is required'),
});

export const getFollowersInput = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export const getFollowingInput = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export default {
  followUserInput,
  unfollowUserInput,
  getFollowersInput,
  getFollowingInput,
}; 