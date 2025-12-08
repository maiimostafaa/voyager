import { supabase } from '../supabase';
import { Profile } from '../types/database.types';

export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
};

export const updateProfile = async (
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    return null;
  }

  return data;
};

export const uploadAvatar = async (
  userId: string,
  imageUri: string
): Promise<string | null> => {
  try {
    // For React Native, we need to handle the file differently
    const fileExt = imageUri.split('.').pop() || 'jpg';
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Create form data for React Native
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: `image/${fileExt}`,
      name: fileName,
    } as any);

    // Upload to Supabase Storage using arrayBuffer approach
    const response = await fetch(imageUri);
    const arrayBuffer = await response.arrayBuffer();
    
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExt}`,
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading avatar:', error);
      return null;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadAvatar:', error);
    return null;
  }
};

