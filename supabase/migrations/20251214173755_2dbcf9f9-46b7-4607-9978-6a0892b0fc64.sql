-- Create panel_services table for user-facing service abstraction
CREATE TABLE public.panel_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL,
  category TEXT NOT NULL,
  min_quantity INTEGER NOT NULL DEFAULT 100,
  max_quantity INTEGER NOT NULL DEFAULT 50000,
  price NUMERIC NOT NULL,
  refill_supported BOOLEAN DEFAULT false,
  dripfeed_supported BOOLEAN DEFAULT false,
  auto_refill_supported BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  provider_service_uuid UUID REFERENCES public.services(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on panel_services
ALTER TABLE public.panel_services ENABLE ROW LEVEL SECURITY;

-- Anyone can view visible panel services (user-facing)
CREATE POLICY "Anyone can view visible panel services"
ON public.panel_services
FOR SELECT
USING (is_visible = true);

-- Admins can manage all panel services
CREATE POLICY "Admins can manage panel services"
ON public.panel_services
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_panel_services_updated_at
BEFORE UPDATE ON public.panel_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_panel_services_service_id ON public.panel_services(service_id);
CREATE INDEX idx_panel_services_platform ON public.panel_services(platform);
CREATE INDEX idx_panel_services_visible ON public.panel_services(is_visible);

-- Add applied_multiplier column to orders to track regional pricing for admin visibility
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS applied_multiplier NUMERIC DEFAULT 1.0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_country_code TEXT;