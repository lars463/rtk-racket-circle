import { supabase } from './supabase';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Emails are sent via Supabase RPC (send_email_via_resend)

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const { data, error } = await supabase.rpc('send_email_via_resend', {
      recipient: to,
      email_subject: subject,
      html_body: html,
    });
    if (error) console.error('Email RPC error:', error);
    return data;
  } catch (e) {
    console.error('Failed to send email:', e);
  }
}

export function emailWrapper(content: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;">
    <h2 style="color:#2E7D32;">RTK Racket Circle</h2>
    ${content}
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0 16px;" />
    <p style="font-size:12px;color:#999;">Du modtager denne email fordi du er medlem af RTK Racket Circle.<br/>
    Du kan ændre dine notifikationsindstillinger under Profil → Rediger profil.</p>
  </div>`;
}

/**
 * Build a green CTA button linking to the live app.
 * @param label  Button text shown to the recipient
 * @param path   Optional path to deep-link into (e.g. '/messages')
 */
export function appLinkButton(label: string, path = '/') {
  const url = `https://app.racketcircle.dk${path}`;
  return `<p style="margin:20px 0;">
    <a href="${url}" style="display:inline-block;background:#2E7D32;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">
      ${label}
    </a>
  </p>`;
}

/**
 * Notify relevant members about a new match based on their sport preferences and skill level
 */
export async function notifyNewMatch(
  sport: 'tennis' | 'padel',
  format: string,
  levelMin: number,
  levelMax: number,
  date: string,
  startTime: string,
  location: string,
  creatorName: string,
  description: string,
  creatorGender: string | null,
  creatorId: string
) {
  try {
    const { data: members } = await supabase
      .from('profiles')
      .select('id, email, first_name, gender, notification_new_match, match_interests, play_level, padel_level')
      .eq('is_active', true)
      .eq('notification_new_match', true);

    if (!members) return;

    const dateFormatted = new Date(date).toLocaleDateString('da-DK', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const formatLabels: Record<string, string> = {
      singles: 'Single',
      singles_mix: 'Single (mix)',
      doubles: 'Double',
      mixed: 'Mixdouble',
    };
    const sportLabel = sport === 'tennis' ? 'Tennis' : 'Padel';
    const formatLabel = formatLabels[format] || format;

    // "Samme køn" formats only notify members of the same gender as the creator
    const isSameGenderFormat = format === 'singles' || format === 'doubles';

    for (const member of members) {
      if (member.id === creatorId) continue;

      const interests = member.match_interests ?? {};
      const memberTennisLevel = member.play_level;
      const memberPadelLevel = member.padel_level;

      // Skip gender mismatch for "samme køn" formats
      if (isSameGenderFormat && creatorGender && member.gender && member.gender !== creatorGender) continue;

      let isInterested = false;

      if (sport === 'padel') {
        const padelInterested =
          (format === 'doubles' && interests.padelDouble) ||
          (format === 'mixed' && interests.padelMix);
        if (padelInterested && (memberPadelLevel == null || (memberPadelLevel >= levelMin && memberPadelLevel <= levelMax))) {
          isInterested = true;
        }
      } else if (sport === 'tennis') {
        const tennisInterested =
          (format === 'singles' && interests.tennisSingle) ||
          (format === 'singles_mix' && interests.tennisSingleMix) ||
          (format === 'doubles' && interests.tennisDouble) ||
          (format === 'mixed' && interests.tennisMix);
        if (tennisInterested && (memberTennisLevel == null || (memberTennisLevel >= levelMin && memberTennisLevel <= levelMax))) {
          isInterested = true;
        }
      }

      if (!isInterested) continue;

      const subject = `Ny kamp: ${sportLabel} ${formatLabel}`;
      const html = emailWrapper(`
        <p>Hej ${escapeHtml(member.first_name)},</p>
        <p>Der er oprettet en ny kamp der matcher dine præferencer:</p>
        <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#2E7D32;">🎾 ${escapeHtml(sportLabel)} ${escapeHtml(formatLabel)}</p>
          <p style="margin:0 0 4px;">📅 ${escapeHtml(dateFormatted)}${startTime ? ` kl. ${escapeHtml(startTime)}` : ''}</p>
          ${location ? `<p style="margin:0 0 4px;">📍 ${escapeHtml(location)}</p>` : ''}
          <p style="margin:0 0 4px;">📊 Niveau: ${escapeHtml(String(levelMin))}–${escapeHtml(String(levelMax))}</p>
          <p style="margin:0 0 4px;">👤 Oprettet af: ${escapeHtml(creatorName)}</p>
          ${description ? `<p style="margin:8px 0 0;font-style:italic;">${escapeHtml(description)}</p>` : ''}
        </div>
        ${appLinkButton('Se kampen i appen', '/events')}
      `);
      sendEmail(member.email, subject, html).catch((err) => console.error('Email send error:', err));
    }
  } catch (e) {
    console.error('Failed to send match notifications:', e);
  }
}

/**
 * Notify all participants that an event has been cancelled/deleted
 */
export async function notifyEventCancelled(
  eventTitle: string,
  eventDate: string,
  eventLocation: string,
  attendeeIds: string[],
  cancelledByName: string
) {
  try {
    if (attendeeIds.length === 0) return;

    const { data: attendees } = await supabase
      .from('profiles')
      .select('id, email, first_name, notification_event_update')
      .in('id', attendeeIds);

    if (!attendees || attendees.length === 0) return;

    const dateFormatted = new Date(eventDate).toLocaleDateString('da-DK', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    for (const attendee of attendees) {
      if (!attendee.notification_event_update) continue;

      const subject = `Begivenhed aflyst: ${eventTitle}`;
      const html = emailWrapper(`
        <p>Hej ${escapeHtml(attendee.first_name)},</p>
        <p>En begivenhed du var tilmeldt er blevet aflyst:</p>
        <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#D32F2F;">❌ ${escapeHtml(eventTitle)}</p>
          <p style="margin:0 0 4px;">📅 ${escapeHtml(dateFormatted)}</p>
          ${eventLocation ? `<p style="margin:0 0 4px;">📍 ${escapeHtml(eventLocation)}</p>` : ''}
          <p style="margin:8px 0 0;">Aflyst af: ${escapeHtml(cancelledByName)}</p>
        </div>
      `);
      sendEmail(attendee.email, subject, html).catch((err) => console.error('Email send error:', err));
    }
  } catch (e) {
    console.error('Failed to send event-cancelled notifications:', e);
  }
}

/**
 * Notify all members (with notification_new_event=true) about a new event
 */
export async function notifyNewEvent(eventTitle: string, eventDate: string, eventLocation: string, organizerName: string, organizerId?: string) {
  try {
    const { data: members } = await supabase
      .from('profiles')
      .select('id, email, first_name, notification_new_event')
      .eq('is_active', true)
      .eq('notification_new_event', true);

    if (!members) return;

    const dateFormatted = new Date(eventDate).toLocaleDateString('da-DK', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

    const subject = `Ny begivenhed: ${eventTitle}`;

    for (const member of members) {
      // Skip the organizer — they don't need a notification about their own event
      if (organizerId && member.id === organizerId) continue;

      const html = emailWrapper(`
        <p>Hej ${escapeHtml(member.first_name)},</p>
        <p>Der er oprettet en ny begivenhed i RTK Racket Circle:</p>
        <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#2E7D32;">${escapeHtml(eventTitle)}</p>
          <p style="margin:0 0 4px;">📅 ${escapeHtml(dateFormatted)}</p>
          ${eventLocation ? `<p style="margin:0 0 4px;">📍 ${escapeHtml(eventLocation)}</p>` : ''}
          <p style="margin:0;">👤 Arrangør: ${escapeHtml(organizerName)}</p>
        </div>
        ${appLinkButton('Se eventet i appen', '/events')}
      `);
      sendEmail(member.email, subject, html).catch((err) => console.error('Email send error:', err));
    }
  } catch (e) {
    console.error('Failed to send event notifications:', e);
  }
}

/**
 * Notify all participants that a match is now full
 */
export async function notifyMatchFull(
  matchId: string,
  sport: string,
  format: string,
  date: string,
  startTime: string,
  location: string,
  playerIds: string[]
) {
  try {
    const { data: players } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, notification_new_match')
      .in('id', playerIds);

    if (!players || players.length === 0) return;

    const allNames = players.map((p) => `${p.first_name} ${p.last_name}`).join(', ');

    const dateFormatted = new Date(date).toLocaleDateString('da-DK', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const sportLabel = sport === 'tennis' ? 'Tennis' : 'Padel';
    const formatLabels: Record<string, string> = { singles: 'Single', singles_mix: 'Single (mix)', doubles: 'Double', mixed: 'Mixdouble' };
    const formatLabel = formatLabels[format] || format;

    for (const player of players) {
      if (!player.notification_new_match) continue;

      const subject = `Kamp fyldt: ${sportLabel} ${formatLabel} – ${dateFormatted}`;
      const html = emailWrapper(`
        <p>Hej ${escapeHtml(player.first_name)},</p>
        <p>Kampen er nu fyldt op – alle pladser er besat!</p>
        <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#2E7D32;">🎾 ${escapeHtml(sportLabel)} ${escapeHtml(formatLabel)}</p>
          <p style="margin:0 0 4px;">📅 ${escapeHtml(dateFormatted)}${startTime ? ` kl. ${escapeHtml(startTime)}` : ''}</p>
          ${location ? `<p style="margin:0 0 4px;">📍 ${escapeHtml(location)}</p>` : ''}
          <p style="margin:8px 0 0;"><strong>Deltagere:</strong> ${escapeHtml(allNames)}</p>
        </div>
        <p>Vi ses på banen! 🎾</p>
      `);
      sendEmail(player.email, subject, html).catch((err) => console.error('Email send error:', err));
    }
  } catch (e) {
    console.error('Failed to send match-full notifications:', e);
  }
}

/**
 * Notify all participants that a match has been cancelled/deleted
 */
export async function notifyMatchCancelled(
  sport: string,
  format: string,
  date: string,
  startTime: string,
  location: string,
  playerIds: string[],
  cancelledByName: string
) {
  try {
    const { data: players } = await supabase
      .from('profiles')
      .select('id, email, first_name, notification_new_match')
      .in('id', playerIds);

    if (!players || players.length === 0) return;

    const dateFormatted = new Date(date).toLocaleDateString('da-DK', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const sportLabel = sport === 'tennis' ? 'Tennis' : 'Padel';
    const formatLabels: Record<string, string> = { singles: 'Single', singles_mix: 'Single (mix)', doubles: 'Double', mixed: 'Mixdouble' };
    const formatLabel = formatLabels[format] || format;

    for (const player of players) {
      if (!player.notification_new_match) continue;

      const subject = `Kamp aflyst: ${sportLabel} ${formatLabel} – ${dateFormatted}`;
      const html = emailWrapper(`
        <p>Hej ${escapeHtml(player.first_name)},</p>
        <p>En kamp du var tilmeldt er blevet aflyst:</p>
        <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#D32F2F;">❌ ${escapeHtml(sportLabel)} ${escapeHtml(formatLabel)}</p>
          <p style="margin:0 0 4px;">📅 ${escapeHtml(dateFormatted)}${startTime ? ` kl. ${escapeHtml(startTime)}` : ''}</p>
          ${location ? `<p style="margin:0 0 4px;">📍 ${escapeHtml(location)}</p>` : ''}
          <p style="margin:8px 0 0;">Aflyst af: ${escapeHtml(cancelledByName)}</p>
        </div>
      `);
      sendEmail(player.email, subject, html).catch((err) => console.error('Email send error:', err));
    }
  } catch (e) {
    console.error('Failed to send match-cancelled notifications:', e);
  }
}

/**
 * Notify a member about a new message (if notification_new_message=true)
 */
export async function notifyNewMessage(recipientId: string, senderName: string, messagePreview: string) {
  try {
    const { data: recipient } = await supabase
      .from('profiles')
      .select('email, first_name, notification_new_message')
      .eq('id', recipientId)
      .single();

    if (!recipient || !recipient.notification_new_message) return;

    const subject = `Ny besked fra ${senderName}`;
    const preview = messagePreview.length > 100 ? messagePreview.slice(0, 100) + '...' : messagePreview;

    const html = emailWrapper(`
      <p>Hej ${escapeHtml(recipient.first_name)},</p>
      <p>Du har modtaget en ny besked fra <strong>${escapeHtml(senderName)}</strong>:</p>
      <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;font-style:italic;">
        "${escapeHtml(preview)}"
      </div>
      ${appLinkButton('Åbn beskeden i appen', '/messages')}
    `);

    sendEmail(recipient.email, subject, html).catch((err) => console.error('Email send error:', err));
  } catch (e) {
    console.error('Failed to send message notification:', e);
  }
}
