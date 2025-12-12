import { supabase } from '../supabase';
import { Post, PostTag, PostImage, PostLike, PostSave } from '../types/database.types';

export const getPosts = async (userId?: string): Promise<Post[]> => {
  let query = supabase.from('posts').select('*');

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', error);
    return [];
  }

  return data || [];
};

export const getPostWithDetails = async (postId: string): Promise<{
  post: Post;
  tags: PostTag[];
  images: PostImage[];
} | null> => {
  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (error || !post) {
    console.error('Error fetching post:', error);
    return null;
  }

  const tags = await getPostTags(postId);
  const images = await getPostImages(postId);

  return { post, tags, images };
};

export const getPostTags = async (postId: string): Promise<PostTag[]> => {
  const { data, error } = await supabase
    .from('post_tags')
    .select('*')
    .eq('post_id', postId);

  if (error) {
    console.error('Error fetching post tags:', error);
    return [];
  }

  return data || [];
};

export interface PostWithTags extends Post {
  tags: PostTag[];
}

export const getPostsWithTags = async (userId?: string): Promise<PostWithTags[]> => {
  // Get posts - optionally filtered by user
  const posts = await getPosts(userId);

  if (posts.length === 0) {
    return [];
  }

  // Get all tags for all posts in one query
  const postIds = posts.map(p => p.id);
  const { data: allTags, error: tagsError } = await supabase
    .from('post_tags')
    .select('*')
    .in('post_id', postIds);

  if (tagsError) {
    console.error('Error fetching post tags:', tagsError);
  }

  // Group tags by post_id
  const tagsByPostId = (allTags || []).reduce((acc, tag) => {
    if (!acc[tag.post_id]) {
      acc[tag.post_id] = [];
    }
    acc[tag.post_id].push(tag);
    return acc;
  }, {} as Record<string, PostTag[]>);

  // Combine posts with their tags
  return posts.map(post => ({
    ...post,
    tags: tagsByPostId[post.id] || [],
  }));
};

export const getFriendsPostsWithTags = async (userId: string): Promise<PostWithTags[]> => {
  // Get user's friends
  const { data: friendships, error: friendsError } = await supabase
    .from('friendships')
    .select('user_id, friend_id')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .eq('status', 'accepted');

  if (friendsError) {
    console.error('Error fetching friendships:', friendsError);
    return [];
  }

  // Extract friend IDs
  const friendIds = (friendships || [])
    .map((f) => (f.user_id === userId ? f.friend_id : f.user_id))
    .filter(Boolean);

  if (friendIds.length === 0) {
    return [];
  }

  // Get posts from friends (no limit - show all)
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('*')
    .in('user_id', friendIds)
    .order('created_at', { ascending: false });

  if (postsError || !posts) {
    console.error('Error fetching friends posts:', postsError);
    return [];
  }

  if (posts.length === 0) {
    return [];
  }

  // Get all tags for all posts in one query
  const postIds = posts.map(p => p.id);
  const { data: allTags, error: tagsError } = await supabase
    .from('post_tags')
    .select('*')
    .in('post_id', postIds);

  if (tagsError) {
    console.error('Error fetching post tags:', tagsError);
  }

  // Group tags by post_id
  const tagsByPostId = (allTags || []).reduce((acc, tag) => {
    if (!acc[tag.post_id]) {
      acc[tag.post_id] = [];
    }
    acc[tag.post_id].push(tag);
    return acc;
  }, {} as Record<string, PostTag[]>);

  // Combine posts with their tags
  return posts.map(post => ({
    ...post,
    tags: tagsByPostId[post.id] || [],
  }));
};

export const getPostsByLocation = async (locationName: string): Promise<PostWithTags[]> => {
  // Get all posts for this location (RLS filters to own posts + friends' posts)
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .ilike('location_name', locationName)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching posts by location:', error);
    return [];
  }

  if (!posts || posts.length === 0) {
    return [];
  }

  // Get all tags for all posts in one query
  const postIds = posts.map(p => p.id);
  const { data: allTags, error: tagsError } = await supabase
    .from('post_tags')
    .select('*')
    .in('post_id', postIds);

  if (tagsError) {
    console.error('Error fetching post tags:', tagsError);
  }

  // Group tags by post_id
  const tagsByPostId = (allTags || []).reduce((acc, tag) => {
    if (!acc[tag.post_id]) {
      acc[tag.post_id] = [];
    }
    acc[tag.post_id].push(tag);
    return acc;
  }, {} as Record<string, PostTag[]>);

  // Combine posts with their tags
  return posts.map(post => ({
    ...post,
    tags: tagsByPostId[post.id] || [],
  }));
};

export const getPostImages = async (postId: string): Promise<PostImage[]> => {
  const { data, error } = await supabase
    .from('post_images')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching post images:', error);
    return [];
  }

  return data || [];
};

export interface FeedPost {
  post: Post;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  tags: PostTag[];
  images: string[];
  likes_count: number;
  is_liked: boolean;
  is_saved: boolean;
}

export const getFriendsFeed = async (userId: string): Promise<FeedPost[]> => {
  // Get user's friends using RLS-enabled query
  const { data: friendships, error: friendsError } = await supabase
    .from('friendships')
    .select('user_id, friend_id')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .eq('status', 'accepted');

  if (friendsError) {
    console.error('Error fetching friendships:', friendsError);
    return [];
  }

  // Extract friend IDs
  const friendIds = (friendships || [])
    .map((f) => (f.user_id === userId ? f.friend_id : f.user_id))
    .filter(Boolean);

  if (friendIds.length === 0) {
    return [];
  }

  // Get posts from friends (no limit - show all)
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('*')
    .in('user_id', friendIds)
    .order('created_at', { ascending: false });

  if (postsError || !posts || posts.length === 0) {
    console.error('Error fetching friends posts:', postsError);
    return [];
  }

  // Get all related data in parallel
  const postIds = posts.map(p => p.id);
  
  const [tagsData, imagesData, likesData, savesData, profilesData] = await Promise.all([
    // Get all tags
    supabase.from('post_tags').select('*').in('post_id', postIds),
    // Get all images
    supabase.from('post_images').select('*').in('post_id', postIds).order('created_at', { ascending: true }),
    // Get user's likes
    supabase.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', postIds),
    // Get user's saves
    supabase.from('post_saves').select('post_id').eq('user_id', userId).in('post_id', postIds),
    // Get all user profiles
    supabase.from('profiles').select('id, username, avatar_url').in('id', friendIds),
  ]);

  // Create lookup maps
  const tagsByPostId = (tagsData.data || []).reduce((acc, tag) => {
    if (!acc[tag.post_id]) acc[tag.post_id] = [];
    acc[tag.post_id].push(tag);
    return acc;
  }, {} as Record<string, PostTag[]>);

  const imagesByPostId = (imagesData.data || []).reduce((acc, img) => {
    if (!acc[img.post_id]) acc[img.post_id] = [];
    acc[img.post_id].push(img.image_url);
    return acc;
  }, {} as Record<string, string[]>);

  const likedPostIds = new Set((likesData.data || []).map(l => l.post_id));
  const savedPostIds = new Set((savesData.data || []).map(s => s.post_id));

  const profilesById = (profilesData.data || []).reduce((acc, profile) => {
    acc[profile.id] = profile;
    return acc;
  }, {} as Record<string, { id: string; username: string; avatar_url: string | null }>);

  // Get like counts for all posts
  const { data: likeCounts } = await supabase
    .from('post_likes')
    .select('post_id')
    .in('post_id', postIds);

  const likeCountsByPostId = (likeCounts || []).reduce((acc, like) => {
    acc[like.post_id] = (acc[like.post_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Combine everything
  return posts.map(post => ({
    post,
    user: profilesById[post.user_id] || {
      id: post.user_id,
      username: 'Unknown',
      avatar_url: null,
    },
    tags: tagsByPostId[post.id] || [],
    images: imagesByPostId[post.id] || [],
    likes_count: likeCountsByPostId[post.id] || 0,
    is_liked: likedPostIds.has(post.id),
    is_saved: savedPostIds.has(post.id),
  }));
};

export const createPost = async (
  userId: string,
  post: {
    location_name: string;
    latitude: number;
    longitude: number;
    notes?: string | null;
    tags?: string[];
    images?: string[];
  }
): Promise<Post | null> => {
  const { data: postData, error: postError } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      location_name: post.location_name,
      latitude: post.latitude,
      longitude: post.longitude,
      notes: post.notes || null,
    })
    .select()
    .single();

  if (postError) {
    console.error('Error creating post:', postError);
    return null;
  }

  // Add tags if provided
  if (post.tags && post.tags.length > 0) {
    const tags = post.tags.map(tag => ({
      post_id: postData.id,
      tag_name: tag,
    }));

    await supabase.from('post_tags').insert(tags);
  }

  // Add images if provided
  if (post.images && post.images.length > 0) {
    const images = post.images.map(imageUrl => ({
      post_id: postData.id,
      image_url: imageUrl,
    }));

    await supabase.from('post_images').insert(images);
  }

  return postData;
};

export const updatePost = async (
  postId: string,
  userId: string,
  updates: Partial<Pick<Post, 'location_name' | 'latitude' | 'longitude' | 'notes'>>
): Promise<Post | null> => {
  const { data, error } = await supabase
    .from('posts')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating post:', error);
    return null;
  }

  return data;
};

export const updatePostTags = async (
  postId: string,
  userId: string,
  tags: string[]
): Promise<boolean> => {
  // Verify ownership
  const { data: post } = await supabase
    .from('posts')
    .select('id')
    .eq('id', postId)
    .eq('user_id', userId)
    .single();

  if (!post) {
    console.error('Post not found or not owned by user');
    return false;
  }

  // Delete existing tags
  await supabase.from('post_tags').delete().eq('post_id', postId);

  // Insert new tags
  if (tags.length > 0) {
    const tagRecords = tags.map(tag => ({
      post_id: postId,
      tag_name: tag,
    }));

    const { error } = await supabase.from('post_tags').insert(tagRecords);
    if (error) {
      console.error('Error updating tags:', error);
      return false;
    }
  }

  return true;
};

export const deletePost = async (postId: string, userId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting post:', error);
    return false;
  }

  return true;
};

export const uploadPostImage = async (
  userId: string,
  postId: string,
  imageUri: string
): Promise<string | null> => {
  try {
    // get file extension from uri
    const uriParts = imageUri.split('.');
    const fileExt = uriParts[uriParts.length - 1]?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${postId}/${fileName}`;

    // for react native, we need to read the file differently
    // fetch the local file and convert to arraybuffer
    const response = await fetch(imageUri);
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from('post-images')
      .upload(filePath, arrayBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
      });

    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('post-images')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadPostImage:', error);
    return null;
  }
};

// ============================================
// POST LIKES
// ============================================

export const likePost = async (postId: string, userId: string): Promise<PostLike | null> => {
  const { data, error } = await supabase
    .from('post_likes')
    .insert({
      post_id: postId,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    // If error is due to duplicate, that's okay - user already liked it
    if (error.code !== '23505') {
      console.error('Error liking post:', error);
    }
    return null;
  }

  return data;
};

export const unlikePost = async (postId: string, userId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error unliking post:', error);
    return false;
  }

  return true;
};

export const getPostLikes = async (postId: string): Promise<PostLike[]> => {
  const { data, error } = await supabase
    .from('post_likes')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching post likes:', error);
    return [];
  }

  return data || [];
};

export const getUserLikedPosts = async (userId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user liked posts:', error);
    return [];
  }

  return (data || []).map(like => like.post_id);
};

export const isPostLiked = async (postId: string, userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();

  if (error) {
    return false;
  }

  return !!data;
};

// ============================================
// POST SAVES
// ============================================

export const savePost = async (postId: string, userId: string): Promise<PostSave | null> => {
  const { data, error } = await supabase
    .from('post_saves')
    .insert({
      post_id: postId,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    // If error is due to duplicate, that's okay - user already saved it
    if (error.code !== '23505') {
      console.error('Error saving post:', error);
    }
    return null;
  }

  return data;
};

export const unsavePost = async (postId: string, userId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('post_saves')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error unsaving post:', error);
    return false;
  }

  return true;
};

export const getSavedPosts = async (userId: string): Promise<Post[]> => {
  const { data, error } = await supabase
    .from('post_saves')
    .select(`
      post_id,
      posts (*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching saved posts:', error);
    return [];
  }

  // Extract posts from the joined data
  return (data || []).map((save: any) => save.posts).filter(Boolean);
};

export interface SavedPostWithDetails {
  post: Post;
  tags: PostTag[];
  created_by: {
    username: string;
    avatar_url: string | null;
  };
  also_recommended_by: Array<{
    username: string;
    avatar_url: string | null;
  }>;
}

export const getSavedPostsWithDetails = async (userId: string): Promise<SavedPostWithDetails[]> => {
  // Get saved posts
  const savedPosts = await getSavedPosts(userId);
  
  if (savedPosts.length === 0) {
    return [];
  }

  const postIds = savedPosts.map(p => p.id);

  // Get tags and user info in parallel
  const [tagsData, profilesData] = await Promise.all([
    supabase.from('post_tags').select('*').in('post_id', postIds),
    supabase.from('profiles').select('id, username, avatar_url').in('id', savedPosts.map(p => p.user_id)),
  ]);

  // Create lookup maps
  const tagsByPostId = (tagsData.data || []).reduce((acc, tag) => {
    if (!acc[tag.post_id]) acc[tag.post_id] = [];
    acc[tag.post_id].push(tag);
    return acc;
  }, {} as Record<string, PostTag[]>);

  const profilesById = (profilesData.data || []).reduce((acc, profile) => {
    acc[profile.id] = profile;
    return acc;
  }, {} as Record<string, { username: string; avatar_url: string | null }>);

  // For each location, get all users who also pinned it
  const results: SavedPostWithDetails[] = [];
  
  for (const post of savedPosts) {
    // Get all posts for this location (to find who else recommended it)
    const { data: otherPosts } = await supabase
      .from('posts')
      .select('user_id')
      .eq('location_name', post.location_name)
      .neq('user_id', post.user_id);

    const otherUserIds = Array.from(new Set((otherPosts || []).map(p => p.user_id)));
    
    let alsoRecommendedBy: Array<{ username: string; avatar_url: string | null }> = [];
    
    if (otherUserIds.length > 0) {
      const { data: otherProfiles } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .in('id', otherUserIds);
      
      alsoRecommendedBy = otherProfiles || [];
    }

    results.push({
      post,
      tags: tagsByPostId[post.id] || [],
      created_by: profilesById[post.user_id] || { username: 'Unknown', avatar_url: null },
      also_recommended_by: alsoRecommendedBy,
    });
  }

  return results;
};

export const getUserSavedPostIds = async (userId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('post_saves')
    .select('post_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user saved post IDs:', error);
    return [];
  }

  return (data || []).map(save => save.post_id);
};

export const isPostSaved = async (postId: string, userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('post_saves')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();

  if (error) {
    return false;
  }

  return !!data;
};
