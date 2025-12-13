-- Voyager Database Schema
-- Run this SQL in your Supabase SQL Editor to create all tables and policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  handle TEXT UNIQUE,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  locations_traveled_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Migration: Add handle column if it doesn't exist (for existing databases)
-- Run this separately if you already have the profiles table:
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS handle TEXT UNIQUE;

-- Locations traveled table
CREATE TABLE IF NOT EXISTS locations_traveled (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Posts table (user recommendations/pins)
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Post tags table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS post_tags (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL CHECK (tag_name IN (
    'Food Spot', 'Live Music', 'Club', 'Bar', 'Nature', 
    'Photo Spot', 'Stays/Lodging', 'Museum', 'Shopping', 'Other'
  )),
  PRIMARY KEY (post_id, tag_name)
);

-- Post images table
CREATE TABLE IF NOT EXISTS post_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Post likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(post_id, user_id)
);

-- Post saves table (bookmarks)
CREATE TABLE IF NOT EXISTS post_saves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(post_id, user_id)
);

-- Friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, friend_id)
);

-- Trip plans table
CREATE TABLE IF NOT EXISTS trip_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Trip plan days table
CREATE TABLE IF NOT EXISTS trip_plan_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_plan_id UUID NOT NULL REFERENCES trip_plans(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  "order" INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_plans_updated_at BEFORE UPDATE ON trip_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper function to check if users are friends
CREATE OR REPLACE FUNCTION are_friends(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friendships
    WHERE ((user_id = user1_id AND friend_id = user2_id) OR
           (user_id = user2_id AND friend_id = user1_id))
    AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations_traveled ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_plan_days ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Locations traveled policies
CREATE POLICY "Users can read their own locations"
  ON locations_traveled FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own locations"
  ON locations_traveled FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own locations"
  ON locations_traveled FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own locations"
  ON locations_traveled FOR DELETE
  USING (auth.uid() = user_id);

-- Posts policies
CREATE POLICY "Users can read posts from friends and their own"
  ON posts FOR SELECT
  USING (
    auth.uid() = user_id OR
    are_friends(auth.uid(), user_id)
  );

CREATE POLICY "Users can insert their own posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);

-- Post tags policies (inherit from posts)
CREATE POLICY "Users can read tags for visible posts"
  ON post_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_tags.post_id
      AND (posts.user_id = auth.uid() OR are_friends(auth.uid(), posts.user_id))
    )
  );

CREATE POLICY "Users can insert tags for their own posts"
  ON post_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_tags.post_id
      AND posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tags from their own posts"
  ON post_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_tags.post_id
      AND posts.user_id = auth.uid()
    )
  );

-- Post images policies (inherit from posts)
CREATE POLICY "Users can read images for visible posts"
  ON post_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_images.post_id
      AND (posts.user_id = auth.uid() OR are_friends(auth.uid(), posts.user_id))
    )
  );

CREATE POLICY "Users can insert images for their own posts"
  ON post_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_images.post_id
      AND posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete images from their own posts"
  ON post_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_images.post_id
      AND posts.user_id = auth.uid()
    )
  );

-- Post likes policies
CREATE POLICY "Users can read likes for visible posts"
  ON post_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_likes.post_id
      AND (posts.user_id = auth.uid() OR are_friends(auth.uid(), posts.user_id))
    )
  );

CREATE POLICY "Users can like posts they can see"
  ON post_likes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_likes.post_id
      AND (posts.user_id = auth.uid() OR are_friends(auth.uid(), posts.user_id))
    )
  );

CREATE POLICY "Users can unlike their own likes"
  ON post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Post saves policies
CREATE POLICY "Users can read their own saves"
  ON post_saves FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts they can see"
  ON post_saves FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_saves.post_id
      AND (posts.user_id = auth.uid() OR are_friends(auth.uid(), posts.user_id))
    )
  );

CREATE POLICY "Users can unsave their own saves"
  ON post_saves FOR DELETE
  USING (auth.uid() = user_id);

-- Friendships policies
CREATE POLICY "Users can read their own friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own friendships"
  ON friendships FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete their own friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Trip plans policies
CREATE POLICY "Users can read their own trip plans"
  ON trip_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trip plans"
  ON trip_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trip plans"
  ON trip_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trip plans"
  ON trip_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Trip plan days policies
CREATE POLICY "Users can read days for their own trip plans"
  ON trip_plan_days FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_plans
      WHERE trip_plans.id = trip_plan_days.trip_plan_id
      AND trip_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert days for their own trip plans"
  ON trip_plan_days FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_plans
      WHERE trip_plans.id = trip_plan_days.trip_plan_id
      AND trip_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update days for their own trip plans"
  ON trip_plan_days FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trip_plans
      WHERE trip_plans.id = trip_plan_days.trip_plan_id
      AND trip_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete days from their own trip plans"
  ON trip_plan_days FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trip_plans
      WHERE trip_plans.id = trip_plan_days.trip_plan_id
      AND trip_plans.user_id = auth.uid()
    )
  );

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create storage bucket for profile avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for post images
CREATE POLICY "Users can upload their own post images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view post images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

CREATE POLICY "Users can delete their own post images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);
