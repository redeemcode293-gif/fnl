-- Add pricing_override column to profiles for admin to set custom pricing per user
-- Values: 'none' (default regional pricing), 'provider' (provider price only), 'custom' (custom multiplier)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pricing_override text DEFAULT 'none';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_multiplier numeric DEFAULT 1.0;

-- Update GCC multiplier to 2.25 for UAE, Kuwait, etc (rich countries)
UPDATE public.regional_pricing 
SET multiplier = 2.25 
WHERE region_code = 'GCC';