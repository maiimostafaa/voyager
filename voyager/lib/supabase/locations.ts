import { supabase } from '../supabase';
import { LocationTraveled } from '../types/database.types';

export const getLocationsTraveled = async (
  userId: string
): Promise<LocationTraveled[]> => {
  const { data, error } = await supabase
    .from('locations_traveled')
    .select('*')
    .eq('user_id', userId)
    .order('visited_at', { ascending: false });

  if (error) {
    console.error('Error fetching locations traveled:', error);
    return [];
  }

  return data || [];
};

export const addLocationTraveled = async (
  userId: string,
  location: {
    location_name: string;
    latitude: number;
    longitude: number;
    visited_at?: string;
  }
): Promise<LocationTraveled | null> => {
  const { data, error } = await supabase
    .from('locations_traveled')
    .insert({
      user_id: userId,
      ...location,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding location traveled:', error);
    return null;
  }

  // Update count in profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('locations_traveled_count')
    .eq('id', userId)
    .single();

  if (profile) {
    await supabase
      .from('profiles')
      .update({ locations_traveled_count: (profile.locations_traveled_count || 0) + 1 })
      .eq('id', userId);
  }

  return data;
};

export const deleteLocationTraveled = async (
  locationId: string,
  userId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('locations_traveled')
    .delete()
    .eq('id', locationId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting location traveled:', error);
    return false;
  }

  // Update count in profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('locations_traveled_count')
    .eq('id', userId)
    .single();

  if (profile && profile.locations_traveled_count > 0) {
    await supabase
      .from('profiles')
      .update({ locations_traveled_count: profile.locations_traveled_count - 1 })
      .eq('id', userId);
  }

  return true;
};

