-- Create regional pricing multipliers table (admin only)
CREATE TABLE public.regional_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_code text NOT NULL UNIQUE,
  region_name text NOT NULL,
  multiplier numeric NOT NULL DEFAULT 1.00,
  countries text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.regional_pricing ENABLE ROW LEVEL SECURITY;

-- Only admins can manage regional pricing
CREATE POLICY "Admins can view regional pricing"
ON public.regional_pricing FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert regional pricing"
ON public.regional_pricing FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update regional pricing"
ON public.regional_pricing FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete regional pricing"
ON public.regional_pricing FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default regional pricing multipliers
INSERT INTO public.regional_pricing (region_code, region_name, multiplier, countries) VALUES
('IN', 'India / South Asia', 1.00, ARRAY['IN', 'PK', 'BD', 'NP', 'LK']),
('SEA', 'Southeast Asia', 1.20, ARRAY['ID', 'VN', 'PH', 'TH', 'MY', 'SG']),
('LATAM', 'Latin America', 1.45, ARRAY['BR', 'MX', 'CO', 'AR', 'CL', 'PE']),
('MENA', 'Middle East & North Africa', 1.50, ARRAY['TR', 'EG', 'MA', 'JO', 'TN', 'DZ']),
('CIS', 'CIS / Eastern Europe', 1.55, ARRAY['RU', 'UA', 'KZ', 'BY', 'GE', 'AZ']),
('GCC', 'Gulf States', 2.00, ARRAY['AE', 'SA', 'QA', 'KW', 'BH', 'OM']),
('TIER1', 'US/UK/CA/AU', 2.25, ARRAY['US', 'CA', 'GB', 'AU', 'NZ']),
('EU', 'Western Europe', 1.90, ARRAY['DE', 'FR', 'NL', 'SE', 'IT', 'ES', 'BE', 'AT', 'CH']),
('AF', 'Africa', 1.30, ARRAY['NG', 'KE', 'GH', 'ZA', 'EG', 'TZ']);

-- Add trigger for updated_at
CREATE TRIGGER update_regional_pricing_updated_at
BEFORE UPDATE ON public.regional_pricing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();