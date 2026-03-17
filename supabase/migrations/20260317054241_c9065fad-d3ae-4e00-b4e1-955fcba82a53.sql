
-- Allow admin and owner to manage services (needed for bulk enable/disable/import)
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
DROP POLICY IF EXISTS "Owner can manage services" ON public.services;

CREATE POLICY "Admins can manage services"
  ON public.services FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner can manage services"
  ON public.services FOR ALL
  USING (public.has_role(auth.uid(), 'owner'::app_role));

-- Also ensure panel_services is manageable by owner
DROP POLICY IF EXISTS "Owner can manage panel services" ON public.panel_services;
CREATE POLICY "Owner can manage panel services"
  ON public.panel_services FOR ALL
  USING (public.has_role(auth.uid(), 'owner'::app_role));
