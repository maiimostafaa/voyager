import { supabase } from '../supabase';
import { Post, PostTag, PostImage } from '../types/database.types';

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

export const getPostsWithTags = async (): Promise<PostWithTags[]> => {
  // Get all posts (RLS automatically filters to own posts and accepted friends' posts)
  const posts = await getPosts();

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
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const fileExt = imageUri.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${postId}/${fileName}`;

    const { error } = await supabase.storage
      .from('post-images')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: false,
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
