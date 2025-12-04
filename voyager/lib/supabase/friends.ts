import { supabase } from '../supabase';
import { Friendship, Profile } from '../types/database.types';

export const getFriends = async (userId: string): Promise<Profile[]> => {
  // Get accepted friendships where user is either user_id or friend_id
  const { data: friendships, error } = await supabase
    .from('friendships')
    .select('user_id, friend_id')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .eq('status', 'accepted');

  if (error) {
    console.error('Error fetching friendships:', error);
    return [];
  }

  // Extract friend IDs
  const friendIds = (friendships || [])
    .map((f) => (f.user_id === userId ? f.friend_id : f.user_id))
    .filter(Boolean);

  if (friendIds.length === 0) {
    return [];
  }

  // Fetch friend profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', friendIds);

  if (profilesError) {
    console.error('Error fetching friend profiles:', profilesError);
    return [];
  }

  return profiles || [];
};

export const getFriendRequests = async (userId: string): Promise<Friendship[]> => {
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .eq('friend_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching friend requests:', error);
    return [];
  }

  return data || [];
};

export const sendFriendRequest = async (
  userId: string,
  friendId: string
): Promise<Friendship | null> => {
  // Check if friendship already exists
  const { data: existing } = await supabase
    .from('friendships')
    .select('*')
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
    .single();

  if (existing) {
    console.error('Friendship already exists');
    return null;
  }

  const { data, error } = await supabase
    .from('friendships')
    .insert({
      user_id: userId,
      friend_id: friendId,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending friend request:', error);
    return null;
  }

  return data;
};

export const acceptFriendRequest = async (
  friendshipId: string,
  userId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
    .eq('friend_id', userId);

  if (error) {
    console.error('Error accepting friend request:', error);
    return false;
  }

  return true;
};

export const rejectFriendRequest = async (
  friendshipId: string,
  userId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)
    .eq('friend_id', userId);

  if (error) {
    console.error('Error rejecting friend request:', error);
    return false;
  }

  return true;
};

export const removeFriend = async (
  userId: string,
  friendId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

  if (error) {
    console.error('Error removing friend:', error);
    return false;
  }

  return true;
};

export const searchUsers = async (
  query: string,
  excludeUserId: string
): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', excludeUserId)
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(20);

  if (error) {
    console.error('Error searching users:', error);
    return [];
  }

  return data || [];
};
