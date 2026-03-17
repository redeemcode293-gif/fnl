import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: any;
  wallet: any;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const [profileResult, walletResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle(),
      ]);

      if (profileResult.data) setProfile(profileResult.data);
      if (walletResult.data) setWallet(walletResult.data);

      // Create wallet if missing
      if (!walletResult.data && !walletResult.error) {
        const { data: newWallet } = await supabase
          .from('wallets')
          .insert({ user_id: userId, balance: 0 })
          .select()
          .single();
        if (newWallet) setWallet(newWallet);
      }

      // Auto-detect country if missing
      if (profileResult.data && !profileResult.data.country) {
        detectAndUpdateCountry(userId);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, []);

  const detectAndUpdateCountry = async (userId: string) => {
    try {
      const response = await supabase.functions.invoke('detect-country');
      if (response.data?.country && response.data?.countryCode) {
        await supabase
          .from('profiles')
          .update({ country: response.data.country, country_code: response.data.countryCode })
          .eq('user_id', userId);
        const { data: updated } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
        if (updated) setProfile(updated);
      }
    } catch (error) {
      // Country detection is non-critical, ignore errors
    }
  };

  const refreshProfile = useCallback(async () => {
    if (user) await fetchUserData(user.id);
  }, [user, fetchUserData]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setWallet(null);
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchUserData(session.user.id), 0);
      } else {
        setProfile(null);
        setWallet(null);
      }
      if (event !== 'INITIAL_SESSION') setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  // Real-time wallet updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('wallet-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'wallets',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new) setWallet(payload.new);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, wallet, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
