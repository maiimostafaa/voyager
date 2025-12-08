import { supabase } from '../supabase';
import { TripPlan, TripPlanDay } from '../types/database.types';

// Create a trip plan
export const createTripPlan = async (
  userId: string,
  trip: { title: string; start_date: string; end_date: string }
): Promise<TripPlan | null> => {
  const { data, error } = await supabase
    .from('trip_plans')
    .insert({ user_id: userId, ...trip })
    .select()
    .single();

  if (error) {
    console.error('Error creating trip plan:', error);
    return null;
  }
  return data;
};

// Get user's trip plans
export const getTripPlans = async (userId: string): Promise<TripPlan[]> => {
  const { data, error } = await supabase
    .from('trip_plans')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Error fetching trip plans:', error);
    return [];
  }

  return data || [];
};

// Get a single trip plan by ID
export const getTripPlan = async (tripPlanId: string): Promise<TripPlan | null> => {
  const { data, error } = await supabase
    .from('trip_plans')
    .select('*')
    .eq('id', tripPlanId)
    .single();

  if (error) {
    console.error('Error fetching trip plan:', error);
    return null;
  }

  return data;
};

// Update a trip plan
export const updateTripPlan = async (
  tripPlanId: string,
  userId: string,
  updates: Partial<Pick<TripPlan, 'title' | 'start_date' | 'end_date'>>
): Promise<TripPlan | null> => {
  const { data, error } = await supabase
    .from('trip_plans')
    .update(updates)
    .eq('id', tripPlanId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating trip plan:', error);
    return null;
  }

  return data;
};

// Delete a trip plan
export const deleteTripPlan = async (tripPlanId: string, userId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('trip_plans')
    .delete()
    .eq('id', tripPlanId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting trip plan:', error);
    return false;
  }

  return true;
};

// Add a day/activity to trip
export const addTripDay = async (
  tripPlanId: string,
  day: { date: string; post_id?: string; order: number }
): Promise<TripPlanDay | null> => {
  const { data, error } = await supabase
    .from('trip_plan_days')
    .insert({ trip_plan_id: tripPlanId, ...day })
    .select()
    .single();

  if (error) {
    console.error('Error adding trip day:', error);
    return null;
  }

  return data || null;
};

// Get all days for a trip plan
export const getTripPlanDays = async (tripPlanId: string): Promise<TripPlanDay[]> => {
  const { data, error } = await supabase
    .from('trip_plan_days')
    .select('*')
    .eq('trip_plan_id', tripPlanId)
    .order('order', { ascending: true });

  if (error) {
    console.error('Error fetching trip plan days:', error);
    return [];
  }

  return data || [];
};

// Get trip plan with days
export const getTripPlanWithDays = async (
  tripPlanId: string
): Promise<{ tripPlan: TripPlan; days: TripPlanDay[] } | null> => {
  const tripPlan = await getTripPlan(tripPlanId);
  if (!tripPlan) return null;

  const days = await getTripPlanDays(tripPlanId);

  return { tripPlan, days };
};

// Update a trip plan day
export const updateTripDay = async (
  dayId: string,
  updates: Partial<Pick<TripPlanDay, 'date' | 'post_id' | 'order'>>
): Promise<TripPlanDay | null> => {
  const { data, error } = await supabase
    .from('trip_plan_days')
    .update(updates)
    .eq('id', dayId)
    .select()
    .single();

  if (error) {
    console.error('Error updating trip day:', error);
    return null;
  }

  return data;
};

// Delete a trip plan day
export const deleteTripDay = async (dayId: string): Promise<boolean> => {
  const { error } = await supabase.from('trip_plan_days').delete().eq('id', dayId);

  if (error) {
    console.error('Error deleting trip day:', error);
    return false;
  }

  return true;
};

