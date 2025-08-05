import { supabase } from './supabaseClient';

export async function followUser(followingId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const followerId = session?.user?.id;
  if (!followerId) throw new Error('Not authenticated');
  const { error } = await supabase.from('followers').insert([{ follower_id: followerId, following_id: followingId }]);
  if (error) throw error;
}

export async function unfollowUser(followingId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const followerId = session?.user?.id;
  if (!followerId) throw new Error('Not authenticated');
  const { error } = await supabase.from('followers')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
  if (error) throw error;
}

export async function isFollowing(followingId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const followerId = session?.user?.id;
  if (!followerId) return false;
  const { data, error } = await supabase.from('followers')
    .select('*')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function getFollowersCount(userId: string) {
  const { count, error } = await supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', userId);
  if (error) throw error;
  return count || 0;
}

export async function getFollowingCount(userId: string) {
  const { count, error } = await supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', userId);
  if (error) throw error;
  return count || 0;
}

export async function getFollowingIds(userId: string) {
  const { data, error } = await supabase.from('followers').select('following_id').eq('follower_id', userId);
  if (error) throw error;
  return (data || []).map((row: any) => row.following_id);
} 