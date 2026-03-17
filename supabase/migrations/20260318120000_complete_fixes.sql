-- ============================================================
-- Complete fixes migration — run this in Supabase SQL Editor
-- ============================================================

-- 1. Unique constraint on panel_services.service_id (required for upsert)
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

-- 2. provider_order_id on orders table (stores SMM provider's order ID for status polling)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS provider_order_id text,
  ADD COLUMN IF NOT EXISTS provider_id_ref text;

CREATE INDEX IF NOT EXISTS idx_orders_provider_order_id
  ON public.orders(provider_order_id)
  WHERE provider_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- 3. Ensure wallets has total_deposited
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS total_deposited numeric NOT NULL DEFAULT 0;

-- 4. Ensure api_providers has currency column
ALTER TABLE public.api_providers
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';

-- 5. RLS: Public can read visible panel_services (unauthenticated users can see service list)
DROP POLICY IF EXISTS "Public can read visible panel services" ON public.panel_services;
CREATE POLICY "Public can read visible panel services"
  ON public.panel_services FOR SELECT
  USING (is_visible = true);

-- 6. RLS: Authenticated users can also read visible services
DROP POLICY IF EXISTS "Authenticated can read visible panel services" ON public.panel_services;
CREATE POLICY "Authenticated can read visible panel services"
  ON public.panel_services FOR SELECT
  TO authenticated
  USING (is_visible = true);

-- 7. RLS: Admins and owners can manage panel_services (insert, update, delete)
DROP POLICY IF EXISTS "Admins can manage panel services" ON public.panel_services;
CREATE POLICY "Admins can manage panel services"
  ON public.panel_services FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'owner')
  );

-- 8. RLS: Service role (edge functions) can manage panel_services — automatic via service key

-- 9. Fix services table RLS to allow admins to insert (not just update)
DROP POLICY IF EXISTS "Admins can insert services" ON public.services;
CREATE POLICY "Admins can insert services"
  ON public.services FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'owner')
  );

-- 10. Make sure orders indexes are efficient
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- 11. Make sure panel_services is indexed for fast loads
CREATE INDEX IF NOT EXISTS idx_panel_services_visible ON public.panel_services(is_visible) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_panel_services_platform ON public.panel_services(platform);

-- Done
