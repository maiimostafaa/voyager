/**
 * Database Types
 * 
 * These types should be generated from your Supabase schema.
 * For now, we'll define them manually based on the planned schema.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string | null;
          bio: string | null;
          avatar_url: string | null;
          locations_traveled_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          locations_traveled_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          full_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          locations_traveled_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      locations_traveled: {
        Row: {
          id: string;
          user_id: string;
          location_name: string;
          latitude: number;
          longitude: number;
          visited_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          location_name: string;
          latitude: number;
          longitude: number;
          visited_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          location_name?: string;
          latitude?: number;
          longitude?: number;
          visited_at?: string;
          created_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          location_name: string;
          latitude: number;
          longitude: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          location_name: string;
          latitude: number;
          longitude: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          location_name?: string;
          latitude?: number;
          longitude?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      post_tags: {
        Row: {
          post_id: string;
          tag_name: string;
        };
        Insert: {
          post_id: string;
          tag_name: string;
        };
        Update: {
          post_id?: string;
          tag_name?: string;
        };
      };
      post_images: {
        Row: {
          id: string;
          post_id: string;
          image_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          image_url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          image_url?: string;
          created_at?: string;
        };
      };
      post_likes: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      post_saves: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      friendships: {
        Row: {
          id: string;
          user_id: string;
          friend_id: string;
          status: 'pending' | 'accepted' | 'blocked';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          friend_id: string;
          status?: 'pending' | 'accepted' | 'blocked';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          friend_id?: string;
          status?: 'pending' | 'accepted' | 'blocked';
          created_at?: string;
        };
      };
      trip_plans: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          start_date: string;
          end_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          start_date: string;
          end_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          start_date?: string;
          end_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      trip_plan_days: {
        Row: {
          id: string;
          trip_plan_id: string;
          date: string;
          post_id: string | null;
          order: number;
        };
        Insert: {
          id?: string;
          trip_plan_id: string;
          date: string;
          post_id?: string | null;
          order: number;
        };
        Update: {
          id?: string;
          trip_plan_id?: string;
          date?: string;
          post_id?: string | null;
          order?: number;
        };
      };
    };
  };
}

// Convenient type exports
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type LocationTraveled = Database['public']['Tables']['locations_traveled']['Row'];
export type Post = Database['public']['Tables']['posts']['Row'];
export type PostTag = Database['public']['Tables']['post_tags']['Row'];
export type PostImage = Database['public']['Tables']['post_images']['Row'];
export type PostLike = Database['public']['Tables']['post_likes']['Row'];
export type PostSave = Database['public']['Tables']['post_saves']['Row'];
export type Friendship = Database['public']['Tables']['friendships']['Row'];
export type TripPlan = Database['public']['Tables']['trip_plans']['Row'];
export type TripPlanDay = Database['public']['Tables']['trip_plan_days']['Row'];

// Valid tag names constant
export const VALID_TAGS = [
  'Food Spot',
  'Live Music',
  'Club',
  'Bar',
  'Nature',
  'Photo Spot',
  'Stays/Lodging',
  'Museum',
  'Shopping',
  'Other',
] as const;

export type TagName = typeof VALID_TAGS[number];
