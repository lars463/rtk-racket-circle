import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ClubEvent } from '@/types';
import { EventRow } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { notifyNewEvent, notifyEventCancelled } from '@/lib/notifications';

// Helper: convert Supabase event row + participant IDs to ClubEvent
function computeEventStatus(startDate: string, endDate: string | null): ClubEvent['status'] {
  const now = new Date();
  const start = new Date(startDate);
  if (start > now) return 'upcoming';
  if (endDate) {
    const end = new Date(endDate);
    if (end > now) return 'ongoing';
    return 'completed';
  }
  // No end date: treat as ongoing until end of start day
  const endOfDay = new Date(start);
  endOfDay.setHours(23, 59, 59, 999);
  if (now <= endOfDay) return 'ongoing';
  return 'completed';
}

function rowToEvent(e: EventRow, attendeeIds: string[]): ClubEvent {
  return {
    id: e.id,
    title: e.title,
    description: e.description ?? '',
    category: (e.type ?? 'social') as ClubEvent['category'],
    status: computeEventStatus(e.date, e.end_date),
    date: e.date,
    startTime: e.date ? new Date(e.date).toTimeString().slice(0, 5) : '',
    endTime: e.end_date ? new Date(e.end_date).toTimeString().slice(0, 5) : '',
    endDateISO: e.end_date ?? null,
    registrationDeadline: e.registration_deadline ?? null,
    location: e.location ?? '',
    address: null,
    organizerId: e.created_by ?? '',
    maxAttendees: e.max_participants,
    attendeeIds,
    imageUrl: null,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  };
}

interface EventsContextType {
  events: ClubEvent[];
  isLoading: boolean;
  getEventById: (id: string) => ClubEvent | undefined;
  getUpcomingEvents: () => ClubEvent[];
  getPastEvents: () => ClubEvent[];
  getMyEvents: (userId: string) => ClubEvent[];
  createEvent: (event: Omit<ClubEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  toggleAttendance: (eventId: string, userId: string) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
}

const EventsContext = createContext<EventsContextType>({
  events: [],
  isLoading: true,
  getEventById: () => undefined,
  getUpcomingEvents: () => [],
  getPastEvents: () => [],
  getMyEvents: () => [],
  createEvent: async () => {},
  toggleAttendance: async () => {},
  deleteEvent: async () => {},
});

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch events from Supabase (only when authenticated)
  useEffect(() => {
    if (!currentUser) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const { data: eventRows } = await supabase
          .from('events')
          .select('*')
          .order('date', { ascending: true });

        if (!eventRows || eventRows.length === 0) {
          setEvents([]);
          return;
        }

        const eventIds = eventRows.map((e: EventRow) => e.id);

        const { data: participants } = await supabase
          .from('event_participants')
          .select('event_id, profile_id')
          .in('event_id', eventIds);

        const evts = eventRows.map((e: EventRow) => {
          const attendeeIds = (participants ?? [])
            .filter((p: { event_id: string; profile_id: string }) => p.event_id === e.id)
            .map((p: { event_id: string; profile_id: string }) => p.profile_id);
          return rowToEvent(e, attendeeIds);
        });

        setEvents(evts);
      } catch (e) {
        console.error('Failed to fetch events:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [currentUser]);

  // Subscribe to realtime events
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('events-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, async (payload) => {
        if (!currentUser) return;
        const e = payload.new as EventRow;
        // Fetch attendees for the new event
        const { data: participants } = await supabase
          .from('event_participants')
          .select('profile_id')
          .eq('event_id', e.id);
        const attendeeIds = (participants ?? []).map((p: { profile_id: string }) => p.profile_id);
        const newEvent = rowToEvent(e, attendeeIds);
        setEvents((prev) => {
          if (prev.find((ev) => ev.id === newEvent.id)) return prev;
          return [...prev, newEvent];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events' }, (payload) => {
        if (!currentUser) return;
        const e = payload.new as EventRow;
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === e.id ? rowToEvent(e, ev.attendeeIds) : ev
          )
        );
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'events' }, (payload) => {
        if (!currentUser) return;
        const e = payload.old as EventRow;
        setEvents((prev) => prev.filter((ev) => ev.id !== e.id));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_participants' }, (payload) => {
        if (!currentUser) return;
        const p = payload.new as { event_id: string; profile_id: string };
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === p.event_id && !ev.attendeeIds.includes(p.profile_id)
              ? { ...ev, attendeeIds: [...ev.attendeeIds, p.profile_id] }
              : ev
          )
        );
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'event_participants' }, (payload) => {
        if (!currentUser) return;
        const p = payload.old as { event_id: string; profile_id: string };
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === p.event_id
              ? { ...ev, attendeeIds: ev.attendeeIds.filter((id) => id !== p.profile_id) }
              : ev
          )
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // Periodically re-evaluate event status (every 60 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setEvents((prev) => {
        let changed = false;
        const updated = prev.map((e) => {
          const newStatus = computeEventStatus(e.date, e.endDateISO);
          if (e.status !== newStatus) {
            changed = true;
            return { ...e, status: newStatus };
          }
          return e;
        });
        return changed ? updated : prev;
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const getEventById = useCallback(
    (id: string) => events.find((e) => e.id === id),
    [events]
  );

  const getUpcomingEvents = useCallback(
    () =>
      events
        .filter((e) => e.status === 'upcoming' || e.status === 'ongoing')
        .sort((a, b) => a.date.localeCompare(b.date)),
    [events]
  );

  const getPastEvents = useCallback(
    () =>
      events
        .filter((e) => e.status === 'completed')
        .sort((a, b) => b.date.localeCompare(a.date)),
    [events]
  );

  const getMyEvents = useCallback(
    (userId: string) =>
      events
        .filter((e) => e.attendeeIds.includes(userId) || e.organizerId === userId)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [events]
  );

  const createEvent = useCallback(async (eventData: Omit<ClubEvent, 'id' | 'createdAt' | 'updatedAt'> & {
    isMatch?: boolean;
    sport?: string | null;
    matchType?: string | null;
    skillLevelMin?: number | null;
    skillLevelMax?: number | null;
  }) => {
    // Build the date string — use local Date to get correct UTC via toISOString()
    const startLocal = new Date(`${eventData.date.split('T')[0]}T${eventData.startTime || '00:00'}:00`);
    const dateStr = startLocal.toISOString();
    const endDateStr = eventData.endTime
      ? new Date(`${eventData.date.split('T')[0]}T${eventData.endTime}:00`).toISOString()
      : null;

    const { data, error: insertError } = await supabase
      .from('events')
      .insert({
        title: eventData.title,
        description: eventData.description,
        date: dateStr,
        end_date: endDateStr,
        registration_deadline: eventData.registrationDeadline || null,
        location: eventData.location,
        type: eventData.category,
        max_participants: eventData.maxAttendees,
        created_by: eventData.organizerId || null,
        is_match: eventData.isMatch ?? false,
        sport: eventData.sport ?? null,
        match_type: eventData.matchType ?? null,
        skill_level_min: eventData.skillLevelMin ?? null,
        skill_level_max: eventData.skillLevelMax ?? null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert event:', JSON.stringify(insertError));
      alert(`Fejl ved oprettelse af event:\n${insertError.message}\n(${insertError.code ?? 'ukendt kode'})`);
      return;
    }

    if (data) {
      // Add organizer as participant
      if (eventData.organizerId) {
        await supabase.from('event_participants').insert({
          event_id: data.id,
          profile_id: eventData.organizerId,
        });
      }

      const newEvent = rowToEvent(data, eventData.organizerId ? [eventData.organizerId] : []);
      setEvents((prev) => [...prev, newEvent]);

      // Send email notifications to members who opted in
      try {
        // Get organizer name
        let organizerName = 'Ukendt';
        if (eventData.organizerId) {
          const { data: organizer } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', eventData.organizerId)
            .single();
          if (organizer) {
            organizerName = `${organizer.first_name} ${organizer.last_name}`;
          }
        }
        notifyNewEvent(eventData.title, dateStr, eventData.location, organizerName, eventData.organizerId);
      } catch (e) {
        console.error('Failed to send event notifications:', e);
      }
    }
  }, []);

  const toggleAttendance = useCallback(async (eventId: string, userId: string) => {
    // Capture state BEFORE optimistic update to avoid stale closure
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    const attending = event.attendeeIds.includes(userId);

    // Block joining if event is full
    if (!attending && event.maxAttendees && event.attendeeIds.length >= event.maxAttendees) return;

    // Optimistic update
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== eventId) return e;
        return {
          ...e,
          attendeeIds: attending
            ? e.attendeeIds.filter((id) => id !== userId)
            : [...e.attendeeIds, userId],
          updatedAt: new Date().toISOString(),
        };
      })
    );

    try {
      let error;
      if (attending) {
        ({ error } = await supabase
          .from('event_participants')
          .delete()
          .eq('event_id', eventId)
          .eq('profile_id', userId));
      } else {
        ({ error } = await supabase
          .from('event_participants')
          .insert({ event_id: eventId, profile_id: userId }));
      }
      if (error) throw error;
    } catch (e) {
      console.error('Toggle attendance error:', JSON.stringify(e));
      alert(`Kunne ikke ${attending ? 'frameld' : 'tilmeld'} event:\n${e instanceof Error ? e.message : String(e)}`);
      // Revert on failure
      setEvents((prev) =>
        prev.map((ev) => {
          if (ev.id !== eventId) return ev;
          const wasAttending = !ev.attendeeIds.includes(userId);
          return {
            ...ev,
            attendeeIds: wasAttending
              ? [...ev.attendeeIds, userId]
              : ev.attendeeIds.filter((id) => id !== userId),
          };
        })
      );
    }
  }, [events]);

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      const event = events.find((e) => e.id === eventId);

      const { error: deleteError } = await supabase.from('events').delete().eq('id', eventId);
      if (deleteError) {
        console.error('Failed to delete event:', JSON.stringify(deleteError));
        alert(`Fejl ved sletning af event:\n${deleteError.message}\n(${deleteError.code ?? 'ukendt kode'})`);
        return;
      }
      setEvents((prev) => prev.filter((e) => e.id !== eventId));

      // Notify attendees about cancellation
      if (event && event.attendeeIds.length > 0) {
        try {
          let cancelledByName = 'Administrator';
          if (currentUser) {
            cancelledByName = `${currentUser.firstName} ${currentUser.lastName}`;
          }
          notifyEventCancelled(
            event.title,
            event.date,
            event.location,
            event.attendeeIds,
            cancelledByName
          );
        } catch (e) {
          console.error('Failed to send event-cancelled notifications:', e);
        }
      }
    } catch (e) {
      console.error('Delete event error:', JSON.stringify(e));
      alert(`Uventet fejl ved sletning af event:\n${e instanceof Error ? e.message : String(e)}`);
    }
  }, [events, currentUser]);

  return (
    <EventsContext.Provider
      value={{
        events,
        isLoading,
        getEventById,
        getUpcomingEvents,
        getPastEvents,
        getMyEvents,
        createEvent,
        toggleAttendance,
        deleteEvent,
      }}>
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  return useContext(EventsContext);
}
