import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Member, SkillCategory } from '@/types';
import { supabase } from '@/lib/supabase';
import { profileToMember, useAuth } from './AuthContext';
import { searchMembers } from '@/utils/search';
import { memberToProfileRow } from '@/utils/profileMapper';

interface MembersContextType {
  members: Member[];
  isLoading: boolean;
  getMemberById: (id: string) => Member | undefined;
  search: (query: string) => Member[];
  filterByIndustry: (category: SkillCategory) => Member[];
  updateMember: (id: string, updates: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  refreshMembers: () => Promise<void>;
}

const MembersContext = createContext<MembersContextType>({
  members: [],
  isLoading: true,
  getMemberById: () => undefined,
  search: () => [],
  filterByIndustry: () => [],
  updateMember: async () => {},
  deleteMember: async () => {},
  refreshMembers: async () => {},
});

export function MembersProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('first_name');

    if (data && !error) {
      setMembers(data.map(profileToMember));
    }
    setIsLoading(false);
  }, []);

  // Fetch when user logs in, clear when they log out
  useEffect(() => {
    if (currentUser) {
      fetchMembers();
    } else {
      setMembers([]);
      setIsLoading(false);
    }
  }, [currentUser, fetchMembers]);

  const getMemberById = useCallback(
    (id: string) => members.find((m) => m.id === id),
    [members]
  );

  const search = useCallback(
    (query: string) => searchMembers(members, query),
    [members]
  );

  const filterByIndustry = useCallback(
    (category: SkillCategory) => members.filter((m) => m.industry === category),
    [members]
  );

  const updateMember = useCallback(async (id: string, updates: Partial<Member>) => {
    const supabaseUpdates = memberToProfileRow(updates);

    try {
      const { data } = await supabase
        .from('profiles')
        .update(supabaseUpdates)
        .eq('id', id)
        .select()
        .single();

      if (data) {
        setMembers((prev) =>
          prev.map((m) => (m.id === id ? profileToMember(data) : m))
        );
      }
    } catch (e) {
      console.error('Update member error:', e);
    }
  }, []);

  const deleteMember = useCallback(async (id: string) => {
    try {
      // Delete auth user first via RPC, then profile cascades
      const { error: rpcError } = await supabase.rpc('delete_auth_user', { user_id: id });
      if (rpcError) console.error('Delete auth user error:', rpcError);

      // Delete profile (cascades to related tables via FK)
      const { error: profileError } = await supabase.from('profiles').delete().eq('id', id);
      if (profileError) {
        console.error('Delete profile error:', profileError);
        throw profileError;
      }
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      console.error('Delete member error:', e);
    }
  }, []);

  const refreshMembers = useCallback(async () => {
    await fetchMembers();
  }, [fetchMembers]);

  return (
    <MembersContext.Provider value={{ members, isLoading, getMemberById, search, filterByIndustry, updateMember, deleteMember, refreshMembers }}>
      {children}
    </MembersContext.Provider>
  );
}

export function useMembers() {
  return useContext(MembersContext);
}
