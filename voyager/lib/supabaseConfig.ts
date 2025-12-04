/**
 * Supabase Configuration
 * 
 * Create a .env file in the root directory with:
 * EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
 * EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
 */

export const SUPABASE_CONFIG = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
};

if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
  console.warn(
    'Supabase configuration is missing. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
  );
}

