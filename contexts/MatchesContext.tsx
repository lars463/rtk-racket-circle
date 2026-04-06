import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Match, SportType, MatchFormat, MatchStatus } from '@/types';
import { MatchRow } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { notifyNewMatch, notifyMatchFull, notifyMatchCancelled } from '@/lib/notifications';

function rowToMatch(m: MatchRow, playerIds: string[]): Match {
  return {
    id: m.id,
    sport: m.sport as SportType,
    format: m.format as MatchFormat,
    status: m.status as MatchStatus,
    description: m.description ?? '',
    date: m.date,
    startTime: m.start_time ?? '',
    endTime: m.end_time ?? '',
    location: m.location ?? '',
    levelMin: m.level_min,
    levelMax: m.level_max,
    maxPlayers: m.max_players,
    playerIds,
    creatorId: m.creator_id ?? '',
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  };
}

interface MatchesContextType {
  matches: Match[];
  isLoading: boolean;
  getMatchById: (id: string) => Match | undefined;
  getOpenMatches: () => Match[];
  getPastMatches: () => Match[];
  getMyMatches: (userId: string) => Match[];
  createMatch: (match: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  toggleParticipation: (matchId: string, userId: string) => Promise<void>;
  deleteMatch: (matchId: string) => Promise<void>;
}

const MatchesContext = createContext<MatchesContextType>({
  matches: [],
  isLoading: true,
  getMatchById: () => undefined,
  getOpenMatches: () => [],
  getPastMatches: () => [],
  getMyMatches: () => [],
  createMatch: async () => {},
  toggleParticipation: async () => {},
  deleteMatch: async () => {},
});

export function MatchesProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch matches from Supabase (only when authenticated)
  useEffect(() => {
    if (!currentUser) {
      setMatches([]);
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const { data: matchRows } = await supabase
          .from('matches')
          .select('*')
          .order('date', { ascending: true });

        if (!matchRows || matchRows.length === 0) {
          setMatches([]);
          setIsLoading(false);
          return;
        }

        const matchIds = matchRows.map((m: MatchRow) => m.id);

        const { data: participants } = await supabase
          .from('match_participants')
          .select('match_id, profile_id')
          .in('match_id', matchIds);

        const results = matchRows.map((m: MatchRow) => {
          const pIds = (participants ?? [])
            .filter((p: { match_id: string; profile_id: string }) => p.match_id === m.id)
            .map((p: { match_id: string; profile_id: string }) => p.profile_id);
          return rowToMatch(m, pIds);
        });

        setMatches(results);
      } catch (e) {
        console.error('Failed to fetch matches:', e);
      }
      setIsLoading(false);
    })();
  }, [currentUser]);

  // Subscribe to realtime matches
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('matches-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, async (payload) => {
        if (!currentUser) return;
        const m = payload.new as MatchRow;
        // Fetch participants for the new match
        const { data: participants } = await supabase
          .from('match_participants')
          .select('profile_id')
          .eq('match_id', m.id);
        const playerIds = (participants ?? []).map((p: { profile_id: string }) => p.profile_id);
        const newMatch = rowToMatch(m, playerIds);
        setMatches((prev) => {
          if (prev.find((match) => match.id === newMatch.id)) return prev;
          return [...prev, newMatch];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, (payload) => {
        if (!currentUser) return;
        const m = payload.new as MatchRow;
        setMatches((prev) =>
          prev.map((match) =>
            match.id === m.id ? rowToMatch(m, match.playerIds) : match
          )
        );
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'matches' }, (payload) => {
        if (!currentUser) return;
        const m = payload.old as MatchRow;
        setMatches((prev) => prev.filter((match) => match.id !== m.id));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_participants' }, (payload) => {
        if (!currentUser) return;
        const p = payload.new as { match_id: string; profile_id: string };
        setMatches((prev) =>
          prev.map((match) =>
            match.id === p.match_id && !match.playerIds.includes(p.profile_id)
              ? { ...match, playerIds: [...match.playerIds, p.profile_id] }
              : match
          )
        );
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'match_participants' }, (payload) => {
        if (!currentUser) return;
        const p = payload.old as { match_id: string; profile_id: string };
        setMatches((prev) =>
          prev.map((match) =>
            match.id === p.match_id
              ? { ...match, playerIds: match.playerIds.filter((id) => id !== p.profile_id) }
              : match
          )
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // Periodically re-evaluate match status and auto-delete old matches (every 60 seconds)
  // Periodically re-evaluate match status and trigger server-side cleanup (every 60 seconds)
  useEffect(() => {
    if (!currentUser) return;

    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
    let cleanupDone = false;

    const checkMatches = () => {
      const now = new Date();
      // Today at midnight — matches are visible the entire match day
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      setMatches((prev) => {
        let changed = false;
        let hasExpired = false;

        const updated = prev.map((m) => {
          const matchDay = new Date(m.date.split('T')[0] + 'T00:00:00');

          // Mark expired matches for server-side cleanup
          if (todayStart.getTime() - matchDay.getTime() > TWO_DAYS_MS) {
            hasExpired = true;
            changed = true;
            return m;
          }

          // Auto-complete matches whose date has passed (day after match day)
          if (matchDay < todayStart && (m.status === 'open' || m.status === 'full')) {
            changed = true;
            return { ...m, status: 'completed' as MatchStatus };
          }

          return m;
        });

        // Trigger server-side cleanup RPC once per session
        if (hasExpired && !cleanupDone) {
          cleanupDone = true;
          supabase.rpc('cleanup_old_matches').then(({ error }) => {
            if (error) console.error('Match cleanup RPC error:', error);
          });
        }

        // Remove expired matches from local state
        if (hasExpired) {
          return updated.filter((m) => {
            const matchDay = new Date(m.date.split('T')[0] + 'T00:00:00');
            return todayStart.getTime() - matchDay.getTime() <= TWO_DAYS_MS;
          });
        }

        return changed ? updated : prev;
      });
    };

    // Run immediately on mount
    checkMatches();

    const interval = setInterval(checkMatches, 60_000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const getMatchById = useCallback(
    (id: string) => matches.find((m) => m.id === id),
    [matches]
  );

  const getOpenMatches = useCallback(
    () =>
      matches
        .filter((m) => m.status === 'open' || m.status === 'full')
        .sort((a, b) => a.date.localeCompare(b.date)),
    [matches]
  );

  const getPastMatches = useCallback(
    () =>
      matches
        .filter((m) => m.status === 'completed')
        .sort((a, b) => b.date.localeCompare(a.date)),
    [matches]
  );

  const getMyMatches = useCallback(
    (userId: string) =>
      matches
        .filter((m) => m.playerIds.includes(userId) || m.creatorId === userId)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [matches]
  );

  const createMatch = useCallback(async (matchData: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('matches')
        .insert({
          sport: matchData.sport,
          format: matchData.format,
          status: matchData.status || 'open',
          description: matchData.description,
          date: matchData.date,
          start_time: matchData.startTime,
          end_time: matchData.endTime,
          location: matchData.location,
          level_min: matchData.levelMin,
          level_max: matchData.levelMax,
          max_players: matchData.maxPlayers,
          creator_id: matchData.creatorId || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to insert match:', insertError);
        alert(`Fejl ved oprettelse: ${insertError.message}`);
        return;
      }

      if (data) {
        // Add creator as participant
        if (matchData.creatorId) {
          await supabase.from('match_participants').insert({
            match_id: data.id,
            profile_id: matchData.creatorId,
          });
        }

        const newMatch = rowToMatch(data, matchData.creatorId ? [matchData.creatorId] : []);
        setMatches((prev) => [...prev, newMatch]);

        // Send targeted email notifications
        try {
          let creatorName = 'Ukendt';
          let creatorGender: string | null = null;
          if (matchData.creatorId) {
            const { data: creator } = await supabase
              .from('profiles')
              .select('first_name, last_name, gender')
              .eq('id', matchData.creatorId)
              .single();
            if (creator) {
              creatorName = `${creator.first_name} ${creator.last_name}`;
              creatorGender = creator.gender;
            }
          }
          notifyNewMatch(
            matchData.sport,
            matchData.format,
            matchData.levelMin,
            matchData.levelMax,
            matchData.date,
            matchData.startTime,
            matchData.location,
            creatorName,
            matchData.description,
            creatorGender,
            matchData.creatorId || ''
          );
        } catch (e) {
          console.error('Failed to send match notifications:', e);
        }
      }
    } catch (e) {
      console.error('Create match error:', e);
    }
  }, []);

  const toggleParticipation = useCallback(async (matchId: string, userId: string) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    // Creator cannot leave
    if (match.creatorId === userId && match.playerIds.includes(userId)) return;

    const isPlayer = match.playerIds.includes(userId);
    if (!isPlayer && match.playerIds.length >= match.maxPlayers) return;

    // Optimistic update
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        let newPlayerIds: string[];
        let newStatus = m.status;
        if (isPlayer) {
          newPlayerIds = m.playerIds.filter((id) => id !== userId);
          if (newStatus === 'full') newStatus = 'open';
        } else {
          newPlayerIds = [...m.playerIds, userId];
          if (newPlayerIds.length >= m.maxPlayers) newStatus = 'full';
        }
        return { ...m, playerIds: newPlayerIds, status: newStatus, updatedAt: new Date().toISOString() };
      })
    );

    try {
      if (isPlayer) {
        await supabase.from('match_participants').delete().eq('match_id', matchId).eq('profile_id', userId);
      } else {
        await supabase.from('match_participants').insert({ match_id: matchId, profile_id: userId });
      }

      const newPlayerCount = isPlayer ? match.playerIds.length - 1 : match.playerIds.length + 1;
      const newStatus = newPlayerCount >= match.maxPlayers ? 'full' : 'open';
      await supabase.rpc('update_match_status', { p_match_id: matchId, p_status: newStatus });

      // Notify all participants when match becomes full
      if (!isPlayer && newStatus === 'full') {
        const allPlayerIds = [...match.playerIds, userId];
        try {
          notifyMatchFull(matchId, match.sport, match.format, match.date, match.startTime, match.location, allPlayerIds);
        } catch (e) {
          console.error('Failed to send match-full notifications:', e);
        }
      }
    } catch (e) {
      console.error('Toggle participation error:', e);
      // Revert on failure
      setMatches((prev) =>
        prev.map((m) => {
          if (m.id !== matchId) return m;
          const revertPlayerIds = isPlayer ? [...m.playerIds, userId] : m.playerIds.filter((id) => id !== userId);
          const revertStatus = revertPlayerIds.length >= m.maxPlayers ? 'full' : 'open';
          return { ...m, playerIds: revertPlayerIds, status: revertStatus };
        })
      );
    }
  }, [matches]);

  const deleteMatch = useCallback(async (matchId: string) => {
    try {
      const match = matches.find((m) => m.id === matchId);

      const { error: deleteError } = await supabase.from('matches').delete().eq('id', matchId);
      if (deleteError) {
        console.error('Failed to delete match:', deleteError);
        alert(`Fejl ved sletning: ${deleteError.message}`);
        return;
      }
      setMatches((prev) => prev.filter((m) => m.id !== matchId));

      // Notify participants if anyone was signed up
      if (match && match.playerIds.length > 0) {
        try {
          let cancelledByName = 'Administrator';
          if (currentUser) {
            cancelledByName = `${currentUser.firstName} ${currentUser.lastName}`;
          }
          notifyMatchCancelled(
            match.sport,
            match.format,
            match.date,
            match.startTime,
            match.location,
            match.playerIds,
            cancelledByName
          );
        } catch (e) {
          console.error('Failed to send match-cancelled notifications:', e);
        }
      }
    } catch (e) {
      console.error('Delete match error:', e);
    }
  }, [matches, currentUser]);

  return (
    <MatchesContext.Provider
      value={{
        matches,
        isLoading,
        getMatchById,
        getOpenMatches,
        getPastMatches,
        getMyMatches,
        createMatch,
        toggleParticipation,
        deleteMatch,
      }}>
      {children}
    </MatchesContext.Provider>
  );
}

export function useMatches() {
  return useContext(MatchesContext);
}
