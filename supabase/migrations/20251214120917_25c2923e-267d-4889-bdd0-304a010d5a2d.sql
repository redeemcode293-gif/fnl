-- Create API providers table for managing external SMM providers
CREATE TABLE public.api_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  api_url text NOT NULL,
  api_key text NOT NULL,
  currency text DEFAULT 'USD',
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'backup')),
  priority integer DEFAULT 1,
  balance numeric DEFAULT 0,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_providers ENABLE ROW LEVEL SECURITY;

-- Only admins can manage providers
CREATE POLICY "Admins can manage providers"
ON public.api_providers
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add provider_id to services table to track which provider a service comes from
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.api_providers(id) ON DELETE SET NULL;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS provider_service_id text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS provider_price numeric DEFAULT 0;

-- Create trigger for updated_at
CREATE TRIGGER update_api_providers_updated_at
  BEFORE UPDATE ON public.api_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();