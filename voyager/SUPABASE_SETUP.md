# Supabase Setup Guide

This guide will help you set up Supabase for the Voyager app.

## 🗄️ Database Schema Overview

The Voyager database consists of the following tables:

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles |
| `posts` | User recommendations/pins |
| `post_tags` | Tags for posts |
| `post_images` | Images for posts |
| `locations_traveled` | Places user has visited |
| `friendships` | Friend connections |
| `trip_plans` | Trip itineraries |
| `trip_plan_days` | Daily items in trips |

All tables are defined in `lib/supabase/schema.sql` with Row Level Security (RLS) policies, triggers, and relationships configured.

## 1. Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in your project details:
   - Name: `voyager` (or your preferred name)
   - Database Password: Choose a strong password (save this!)
   - Region: Choose the closest region to your users
5. Wait for the project to be created (takes a few minutes)

## 2. Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys" → "anon public")

## 3. Set Up Environment Variables

1. Create a `.env` file in the `voyager` directory (root of the project)
2. Add the following:

```
EXPO_PUBLIC_SUPABASE_URL=your_project_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
EXPO_PUBLIC_WEATHER_API_KEY=your_weather_api_key_here
```

Replace `your_project_url_here` and `your_anon_key_here` with the values from step 2.

**For Weather API (Optional but recommended for Trip Planning):**
1. Go to [https://openweathermap.org/api](https://openweathermap.org/api)
2. Sign up for a free account
3. Get your API key from the API keys section
4. Add `EXPO_PUBLIC_WEATHER_API_KEY=your_weather_api_key_here` to your `.env` file

The weather API is used in the Trip Plan feature to show weather icons for each day of your trip.

**Note:** The `.env` file is gitignored, so it won't be committed to your repository.

## 4. Set Up the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Open the file `voyager/lib/supabase/schema.sql`
3. Copy the entire contents of that file
4. Paste it into the SQL Editor in Supabase
5. Click "Run" to execute the SQL

This will create:
- All necessary tables (profiles, posts, locations_traveled, etc.)
- Row Level Security (RLS) policies
- Database triggers
- Storage bucket for avatars

## 5. Enable Email Authentication

Email/password authentication is enabled by default in Supabase. No additional configuration needed!

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Make sure **Email** provider is enabled (it should be by default)
3. Optionally configure email templates under **Authentication** → **Email Templates**

That's it! Users can now sign up and sign in with email and password.

**Note:** If you want to add OAuth providers (Google, Apple) later, you can enable them in the same **Authentication** → **Providers** section.

## 6. Configure Storage

The schema SQL already creates the `avatars` bucket, but you may need to:

1. Go to **Storage** in Supabase dashboard
2. Verify the `avatars` bucket exists
3. Check that the bucket is public (for avatar images)

## 7. Test the Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the Expo development server:
   ```bash
   npm start
   ```

3. Try logging in with Google or Apple OAuth
4. Check that a profile is created automatically in the `profiles` table

## Troubleshooting

### "Supabase configuration is missing" warning
- Make sure your `.env` file exists in the `voyager` directory
- Verify the environment variable names are correct (EXPO_PUBLIC_ prefix is required)
- Restart your Expo development server after creating/updating `.env`

### OAuth redirect not working
- Make sure the redirect URL in Supabase matches `voyager://auth`
- Verify the scheme is set in `app.json` (already configured)
- For iOS, you may need to configure URL schemes in Xcode

### Profile not created automatically
- Check the database trigger `on_auth_user_created` exists
- Verify RLS policies allow inserts to the profiles table
- Check Supabase logs for errors

### RLS policy errors
- Make sure all RLS policies were created successfully
- Verify you're authenticated when testing queries
- Check that the `are_friends` function exists

## Next Steps

Once Supabase is set up:
- Test authentication flow
- Create some test posts
- Test friend relationships
- Verify profile image uploads work

For more information, see the [Supabase Documentation](https://supabase.com/docs).

