-- Drop tables script for Boardie
-- Run this if you need to reset your database schema

-- First drop the triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop the junction table first (has foreign keys to other tables)
DROP TABLE IF EXISTS public.post_tags;

-- Drop the main tables
DROP TABLE IF EXISTS public.posts;
DROP TABLE IF EXISTS public.tags;
DROP TABLE IF EXISTS public.profiles;

-- Disable RLS if needed
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.post_tags DISABLE ROW LEVEL SECURITY;
