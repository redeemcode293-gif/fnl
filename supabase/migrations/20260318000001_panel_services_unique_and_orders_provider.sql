-- Ensure panel_services.service_id has a unique constraint (required for upsert onConflict:'service_id')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'panel_services_service_id_unique' 
    AND conrelid = 'public.panel_services'::regclass
  ) THEN
    ALTER TABLE public.panel_services 
      ADD CONSTRAINT panel_services_service_id_unique UNIQUE (service_id);
  END IF;
END $$;

-- Add provider_order_id column to orders table (stores the ID from the SMM provider's system)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS provider_order_id text,
  ADD COLUMN IF NOT EXISTS provider_id text;

-- Index for faster provider order lookups
CREATE INDEX IF NOT EXISTS idx_orders_provider_order_id ON public.orders(provider_order_id) WHERE provider_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- Ensure wallets table has total_deposited column
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS total_deposited numeric NOT NULL DEFAULT 0;

-- Ensure api_providers has currency column
ALTER TABLE public.api_providers
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';

-- Panel services RLS: everyone can read visible services
DROP POLICY IF EXISTS "Anyone can view visible panel services" ON public.panel_services;
CREATE POLICY "Anyone can view visible panel services"
  ON public.panel_services FOR SELECT
  USING (is_visible = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Admin can manage panel services
DROP POLICY IF EXISTS "Admins can manage panel services" ON public.panel_services;
CREATE POLICY "Admins can manage panel services"
  ON public.panel_services FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow edge functions (service role) to bypass RLS on panel_services
-- This is automatic for service role key, but let's ensure anon can read visible ones
