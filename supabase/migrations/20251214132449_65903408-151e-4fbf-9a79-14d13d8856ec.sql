-- Add status column to profiles for banning users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Add last_password_change column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_password_change timestamp with time zone;

-- Create login_history table
CREATE TABLE IF NOT EXISTS public.login_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  ip_address text,
  user_agent text,
  device_info text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on login_history
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Only admins can view login history
CREATE POLICY "Admins can view login history" ON public.login_history
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Users can insert their own login history
CREATE POLICY "Users can insert their own login history" ON public.login_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create api_keys table for user API keys
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  api_key text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone
);

-- Enable RLS on api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Users can view their own API keys
CREATE POLICY "Users can view their own api keys" ON public.api_keys
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all API keys
CREATE POLICY "Admins can view all api keys" ON public.api_keys
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update API keys
CREATE POLICY "Admins can update api keys" ON public.api_keys
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));