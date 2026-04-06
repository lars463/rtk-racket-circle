import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Member } from '@/types';
import { ProfileRow } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { memberToProfileRow } from '@/utils/profileMapper';

// Helper: convert Supabase profile row to Member
function profileToMember(p: ProfileRow): Member {
  return {
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    gender: (p.gender as Member['gender']) ?? null,
    avatarUrl: p.avatar_url,
    email: p.email,
    phone: p.phone ?? '',
    bio: p.bio ?? '',
    companyName: p.company_name ?? '',
    jobTitle: p.job_title ?? '',
    industry: (p.industry ?? 'other') as Member['industry'],
    businessDescription: p.business_description ?? '',
    website: p.website ?? null,
    linkedIn: p.linked_in ?? null,
    memberSince: p.member_since ?? new Date().toISOString().split('T')[0],
    membershipTier: (p.membership_tier ?? 'standard') as Member['membershipTier'],
    playLevel: (p.play_level ?? null) as Member['playLevel'],
    padelLevel: (p.padel_level ?? null) as Member['padelLevel'],
    familyInRTK: p.family_in_rtk ?? null,
    familyPhotos: p.family_photos ?? [],
    rtkCompetencies: p.rtk_competencies ?? null,
    matchInterests: p.match_interests ?? { padelDouble: false, padelMix: false, tennisDouble: false, tennisMix: false, tennisSingle: false, tennisSingleMix: false },
    isAdmin: p.is_admin ?? false,
    isActive: p.is_active ?? true,
    notificationNewMessage: p.notification_new_message ?? true,
    notificationNewEvent: p.notification_new_event ?? true,
    notificationNewMatch: p.notification_new_match ?? true,
    notificationEventUpdate: p.notification_event_update ?? true,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

interface AuthContextType {
  currentUser: Member | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<Member>) => Promise<void>;
  changePassword: (currentPwd: string, newPwd: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (profileId: string, newPwd: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isLoading: true,
  login: async () => false,
  logout: () => {},
  updateProfile: async () => {},
  changePassword: async () => ({ success: false }),
  resetPassword: async () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On app load: check for existing Supabase Auth session
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (data && data.is_active !== false) {
            setCurrentUser(profileToMember(data));
          } else {
            await supabase.auth.signOut();
          }
        }
      } catch (e) {
        console.error('Session check error:', e);
      }
      setIsLoading(false);
    })();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error || !data.user) return false;

      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (!profile || profile.is_active === false) {
        await supabase.auth.signOut();
        return false;
      }

      setCurrentUser(profileToMember(profile));
      return true;
    } catch (e) {
      console.error('Login error:', e);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    setCurrentUser(null);
    await supabase.auth.signOut();
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Member>) => {
    if (!currentUser) return;

    const supabaseUpdates = memberToProfileRow(updates);

    try {
      const { data } = await supabase
        .from('profiles')
        .update(supabaseUpdates)
        .eq('id', currentUser.id)
        .select()
        .single();

      if (data) {
        setCurrentUser(profileToMember(data));
      }
    } catch (e) {
      console.error('Update profile error:', e);
    }
  }, [currentUser]);

  const changePassword = useCallback(async (currentPwd: string, newPwd: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Ikke logget ind' };

    try {
      // Verify current password by attempting re-login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPwd,
      });

      if (signInError) {
        return { success: false, error: 'Nuværende adgangskode er forkert' };
      }

      // Update password via Supabase Auth
      const { error } = await supabase.auth.updateUser({ password: newPwd });

      if (error) return { success: false, error: 'Kunne ikke opdatere adgangskode' };
      return { success: true };
    } catch (e) {
      console.error('Change password error:', e);
      return { success: false, error: 'Der opstod en fejl' };
    }
  }, [currentUser]);

  const resetPassword = useCallback(async (profileId: string, newPwd: string): Promise<boolean> => {
    try {
      // Admin reset: get user email, then update via admin API through RPC
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', profileId)
        .single();

      if (!profile) return false;

      const { data, error } = await supabase.rpc('update_auth_password', {
        user_email: profile.email,
        new_password: newPwd,
      });

      return !error;
    } catch (e) {
      console.error('Reset password error:', e);
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout, updateProfile, changePassword, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export { profileToMember };
