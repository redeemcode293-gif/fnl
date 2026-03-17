import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const DEFAULT_FALLBACK_MULTIPLIER = 1.40;

interface UseRegionalPricingResult {
  multiplier: number;
  loading: boolean;
  countryCode: string | null;
  refreshMultiplier: () => Promise<void>;
}

export const useRegionalPricing = (): UseRegionalPricingResult => {
  const { profile, loading: authLoading } = useAuth();
  const [multiplier, setMultiplier] = useState<number>(DEFAULT_FALLBACK_MULTIPLIER);
  const [loading, setLoading] = useState(true);
  const [countryCode, setCountryCode] = useState<string | null>(null);

  const fetchMultiplierForCountry = useCallback(async (code: string): Promise<number> => {
    try {
      const { data: regions } = await supabase
        .from('regional_pricing')
        .select('*');

      if (regions) {
        for (const region of regions) {
          if (region.countries?.includes(code)) {
            console.log(`Regional pricing: Found multiplier ${region.multiplier} for country ${code} in region ${region.region_name}`);
            return Number(region.multiplier);
          }
        }
      }
      console.log(`Regional pricing: No region found for country ${code}, using fallback ${DEFAULT_FALLBACK_MULTIPLIER}`);
      return DEFAULT_FALLBACK_MULTIPLIER;
    } catch (e) {
      console.error('Error fetching regional pricing:', e);
      return DEFAULT_FALLBACK_MULTIPLIER;
    }
  }, []);

  const refreshMultiplier = useCallback(async () => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Check for pricing_override first (admin special pricing)
      if (profile?.pricing_override === 'provider') {
        console.log('Regional pricing: User has provider pricing override, using 1.0x multiplier');
        setMultiplier(1.0);
        setCountryCode(profile.country_code || null);
        setLoading(false);
        return;
      }

      // For authenticated users with country_code in profile
      if (profile?.country_code) {
        console.log(`Regional pricing: Using profile country code: ${profile.country_code}`);
        setCountryCode(profile.country_code);
        const mult = await fetchMultiplierForCountry(profile.country_code);
        setMultiplier(mult);
        setLoading(false);
        return;
      }

      // For unauthenticated users or users without country_code, detect via IP
      console.log('Regional pricing: No profile country code, detecting via IP...');
      const { data: countryData, error } = await supabase.functions.invoke('detect-country');
      
      if (error || !countryData?.countryCode || countryData.countryCode === 'XX') {
        console.log('Regional pricing: Country detection failed, using fallback');
        setCountryCode(null);
        setMultiplier(DEFAULT_FALLBACK_MULTIPLIER);
        setLoading(false);
        return;
      }

      console.log(`Regional pricing: Detected country via IP: ${countryData.countryCode}`);
      setCountryCode(countryData.countryCode);
      const mult = await fetchMultiplierForCountry(countryData.countryCode);
      setMultiplier(mult);
    } catch (e) {
      console.error('Error in regional pricing:', e);
      setMultiplier(DEFAULT_FALLBACK_MULTIPLIER);
    } finally {
      setLoading(false);
    }
  }, [profile?.country_code, profile?.pricing_override, authLoading, fetchMultiplierForCountry]);

  useEffect(() => {
    refreshMultiplier();
  }, [refreshMultiplier]);

  return {
    multiplier,
    loading: loading || authLoading,
    countryCode,
    refreshMultiplier,
  };
};
