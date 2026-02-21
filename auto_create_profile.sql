-- ============================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  is_premium BOOLEAN DEFAULT false,
  premium_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add any custom fields
  bio TEXT,
  website TEXT,
  location TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  
  -- Ensure username is provided
  CONSTRAINT username_not_empty CHECK (username IS NOT NULL AND username != '')
);

-- Create user_stats table
CREATE TABLE IF NOT EXISTS public.user_stats (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  cases_solved INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  rank TEXT DEFAULT 'Detective Trainee',
  cases_played TEXT[] DEFAULT '{}',
  case_progress JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can view their own stats" 
  ON public.user_stats FOR SELECT 
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can update their own stats" 
  ON public.user_stats FOR UPDATE 
  USING (auth.uid() = profile_id);

-- ============================================
-- FUNCTION: Handle new user creation
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER 
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_username TEXT;
  base_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Extract base username from email or metadata
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'preferred_username',
    split_part(NEW.email, '@', 1)
  );
  
  -- Clean username
  base_username := regexp_replace(
    lower(COALESCE(base_username, 'user')),
    '[^a-z0-9]',
    '_',
    'g'
  );
  
  -- Ensure unique username
  new_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = new_username) LOOP
    counter := counter + 1;
    new_username := base_username || '_' || counter;
  END LOOP;
  
  -- Insert profile
  INSERT INTO public.profiles (
    id,
    username,
    email,
    full_name,
    avatar_url,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    new_username,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      initcap(replace(new_username, '_', ' '))
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      'https://www.gravatar.com/avatar/' || md5(lower(NEW.email)) || '?d=mp'
    ),
    NOW(),
    NOW()
  );
  
  -- Create user stats
  INSERT INTO public.user_stats (profile_id)
  VALUES (NEW.id);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FUNCTION: Handle user updates
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.profiles
  SET
    email = NEW.email,
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Create update trigger
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_update();

-- ============================================
-- FUNCTION: Get profile with stats (helper)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_profile_with_stats(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'profile', row_to_json(p),
    'stats', row_to_json(s)
  ) INTO result
  FROM public.profiles p
  LEFT JOIN public.user_stats s ON s.profile_id = p.id
  WHERE p.id = user_id;
  
  RETURN result;
END;
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.user_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_with_stats TO authenticated;

-- ============================================
-- Backfill for existing users
-- ============================================

DO $$
DECLARE
  user_record RECORD;
  created_count INTEGER := 0;
BEGIN
  FOR user_record IN 
    SELECT * FROM auth.users 
    WHERE id NOT IN (SELECT id FROM public.profiles)
  LOOP
    BEGIN
      INSERT INTO public.profiles (id, username, email)
      VALUES (
        user_record.id,
        COALESCE(
          split_part(user_record.email, '@', 1) || '_' || floor(random() * 1000)::text,
          'user_' || floor(random() * 10000)::text
        ),
        user_record.email
      );
      
      INSERT INTO public.user_stats (profile_id)
      VALUES (user_record.id);
      
      created_count := created_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create profile for user %: %', user_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Created profiles for % existing users', created_count;
END;
$$;
