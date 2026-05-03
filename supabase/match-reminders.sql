-- ============================================
-- RTK Racket Circle — Match Reminder System (24h before kickoff)
-- Run this in Supabase SQL Editor (idempotent)
--
-- Sends an email to each participant about 24h before the match starts.
-- A GitHub Action calls send_match_reminders() hourly; the function
-- finds matches in a [now+23h, now+25h] window that haven't been
-- reminded yet, sends emails, and marks them as reminded.
-- ============================================

-- 1. Add column to track whether a reminder has been sent
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- 2. The RPC. SECURITY DEFINER so it can email + update on behalf of users.
CREATE OR REPLACE FUNCTION send_match_reminders()
RETURNS TABLE (matches_reminded INTEGER, emails_sent INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m record;
  p record;
  match_start_utc TIMESTAMPTZ;
  hours_until NUMERIC;
  date_label TEXT;
  time_label TEXT;
  sport_label TEXT;
  format_label TEXT;
  player_names TEXT;
  email_subject TEXT;
  email_html TEXT;
  m_count INTEGER := 0;
  e_count INTEGER := 0;
BEGIN
  FOR m IN
    SELECT id, sport, format, date, start_time, location,
           level_min, level_max, max_players, status
    FROM matches
    WHERE COALESCE(reminder_sent, FALSE) = FALSE
      AND status IN ('open', 'full')
      AND start_time IS NOT NULL
  LOOP
    -- Combine date + start_time, interpret as Copenhagen local time
    BEGIN
      match_start_utc := (m.date::date + m.start_time::time)
                        AT TIME ZONE 'Europe/Copenhagen';
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;  -- skip rows with malformed time
    END;

    hours_until := EXTRACT(EPOCH FROM (match_start_utc - now())) / 3600.0;

    -- Window: between 23 and 25 hours away (1h tolerance on either side
    -- of the 24h target — the cron runs hourly so every match catches
    -- exactly one window).
    IF hours_until <= 23.0 OR hours_until > 25.0 THEN
      CONTINUE;
    END IF;

    -- Pre-compute display strings
    date_label := to_char(m.date::date, 'TMDay" d. "DD" "TMMonth');
    time_label := substring(m.start_time, 1, 5);
    sport_label := CASE m.sport WHEN 'tennis' THEN 'Tennis'
                                WHEN 'padel'  THEN 'Padel'
                                ELSE initcap(m.sport) END;
    format_label := CASE m.format
                      WHEN 'singles'     THEN 'Single'
                      WHEN 'singles_mix' THEN 'Single (mix)'
                      WHEN 'doubles'     THEN 'Double'
                      WHEN 'mixed'       THEN 'Mixdouble'
                      ELSE m.format END;

    -- Comma-separated participant names (only those who get the reminder)
    SELECT string_agg(pr.first_name || ' ' || pr.last_name, ', '
                      ORDER BY pr.first_name)
    INTO player_names
    FROM match_participants mp
    JOIN profiles pr ON pr.id = mp.profile_id
    WHERE mp.match_id = m.id;

    -- Send email to each participant who has notifications enabled
    FOR p IN
      SELECT pr.id, pr.email, pr.first_name
      FROM match_participants mp
      JOIN profiles pr ON pr.id = mp.profile_id
      WHERE mp.match_id = m.id
        AND COALESCE(pr.notification_new_match, TRUE) = TRUE
        AND COALESCE(pr.is_active, TRUE) = TRUE
    LOOP
      email_subject := 'Reminder: ' || sport_label || ' ' || format_label
                       || ' i morgen kl. ' || time_label;
      email_html := format($html$
<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;">
  <h2 style="color:#2E7D32;">RTK Racket Circle</h2>
  <p>Hej %s,</p>
  <p>Husk din kamp i morgen!</p>
  <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
    <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#2E7D32;">🎾 %s %s</p>
    <p style="margin:0 0 4px;">📅 %s kl. %s</p>
    %s
    <p style="margin:8px 0 0;"><strong>Deltagere:</strong> %s</p>
  </div>
  <p>God kamp! 🎾</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0 16px;" />
  <p style="font-size:12px;color:#999;">Du modtager denne email fordi du er medlem af RTK Racket Circle.<br/>
  Du kan ændre dine notifikationsindstillinger under Profil → Rediger profil.</p>
</div>
$html$,
        p.first_name,
        sport_label,
        format_label,
        date_label,
        time_label,
        CASE WHEN m.location IS NOT NULL AND m.location <> ''
             THEN '<p style="margin:0 0 4px;">📍 ' || m.location || '</p>'
             ELSE '' END,
        COALESCE(player_names, '–')
      );

      PERFORM send_email_via_resend(p.email, email_subject, email_html);
      e_count := e_count + 1;
    END LOOP;

    -- Mark this match as reminded so we don't double-send
    UPDATE matches SET reminder_sent = TRUE WHERE id = m.id;
    m_count := m_count + 1;
  END LOOP;

  RETURN QUERY SELECT m_count, e_count;
END;
$$;

GRANT EXECUTE ON FUNCTION send_match_reminders() TO anon, authenticated;

-- 3. Reset reminder_sent for any test data (optional cleanup)
-- UPDATE matches SET reminder_sent = FALSE WHERE status IN ('open','full');

-- 4. Sanity test (returns 0/0 if no matches qualify right now):
-- SELECT * FROM send_match_reminders();
