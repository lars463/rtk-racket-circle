/**
 * Supabase database row types.
 *
 * These interfaces mirror the column names (snake_case) returned by Supabase
 * queries.  They are used to replace `any` in mapper functions that convert
 * database rows into the camelCase domain types used throughout the app.
 */

// ---------------------------------------------------------------------------
// profiles
// ---------------------------------------------------------------------------

export interface ProfileRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  gender: string | null;
  avatar_url: string | null;
  phone: string;
  bio: string;
  company_name: string;
  job_title: string;
  industry: string;
  business_description: string;
  website: string | null;
  linked_in: string | null;
  member_since: string;
  membership_tier: string;
  play_level: number | null;
  padel_level: number | null;
  family_in_rtk: string | null;
  family_photos: string[];
  rtk_competencies: string | null;
  match_interests: {
    padelDouble: boolean;
    padelMix: boolean;
    tennisDouble: boolean;
    tennisMix: boolean;
    tennisSingle: boolean;
    tennisSingleMix: boolean;
  };
  is_admin: boolean;
  is_active: boolean;
  notification_new_message: boolean;
  notification_new_event: boolean;
  notification_new_match: boolean;
  notification_event_update: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// events
// ---------------------------------------------------------------------------

export interface EventRow {
  id: string;
  title: string;
  description: string;
  date: string;
  end_date: string | null;
  registration_deadline: string | null;
  location: string;
  type: string;
  max_participants: number | null;
  created_by: string | null;
  is_match: boolean;
  sport: string | null;
  match_type: string | null;
  skill_level_min: number | null;
  skill_level_max: number | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// event_participants
// ---------------------------------------------------------------------------

export interface EventParticipantRow {
  id: string;
  event_id: string;
  profile_id: string;
  joined_at: string;
}

// ---------------------------------------------------------------------------
// matches  (not in migration.sql but used by MatchesContext)
// ---------------------------------------------------------------------------

export interface MatchRow {
  id: string;
  sport: string;
  format: string;
  status: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  level_min: number;
  level_max: number;
  max_players: number;
  creator_id: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// match_participants
// ---------------------------------------------------------------------------

export interface MatchParticipantRow {
  id: string;
  match_id: string;
  profile_id: string;
  joined_at?: string;
}

// ---------------------------------------------------------------------------
// conversations
// ---------------------------------------------------------------------------

export interface ConversationRow {
  id: string;
  last_message_text: string | null;
  last_message_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// conversation_participants
// ---------------------------------------------------------------------------

export interface ConversationParticipantRow {
  id: string;
  conversation_id: string;
  profile_id: string;
}

// ---------------------------------------------------------------------------
// messages
// ---------------------------------------------------------------------------

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  is_read: boolean;
  created_at: string;
}
