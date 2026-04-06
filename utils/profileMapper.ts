import { Member } from '@/types';
import { ProfileRow } from '@/types/database';

/**
 * Convert partial Member updates to Supabase ProfileRow column names.
 * Shared between AuthContext.updateProfile and MembersContext.updateMember.
 */
export function memberToProfileRow(updates: Partial<Member>): Partial<ProfileRow> {
  const row: Partial<ProfileRow> = {};
  if (updates.firstName !== undefined) row.first_name = updates.firstName;
  if (updates.lastName !== undefined) row.last_name = updates.lastName;
  if (updates.gender !== undefined) row.gender = updates.gender;
  if (updates.avatarUrl !== undefined) row.avatar_url = updates.avatarUrl;
  if (updates.email !== undefined) row.email = updates.email;
  if (updates.phone !== undefined) row.phone = updates.phone;
  if (updates.bio !== undefined) row.bio = updates.bio;
  if (updates.companyName !== undefined) row.company_name = updates.companyName;
  if (updates.jobTitle !== undefined) row.job_title = updates.jobTitle;
  if (updates.industry !== undefined) row.industry = updates.industry;
  if (updates.businessDescription !== undefined) row.business_description = updates.businessDescription;
  if (updates.website !== undefined) row.website = updates.website;
  if (updates.linkedIn !== undefined) row.linked_in = updates.linkedIn;
  if (updates.playLevel !== undefined) row.play_level = updates.playLevel;
  if (updates.padelLevel !== undefined) row.padel_level = updates.padelLevel;
  if (updates.familyInRTK !== undefined) row.family_in_rtk = updates.familyInRTK;
  if (updates.familyPhotos !== undefined) row.family_photos = updates.familyPhotos;
  if (updates.rtkCompetencies !== undefined) row.rtk_competencies = updates.rtkCompetencies;
  if (updates.matchInterests !== undefined) row.match_interests = updates.matchInterests;
  if (updates.isActive !== undefined) row.is_active = updates.isActive;
  if (updates.isAdmin !== undefined) row.is_admin = updates.isAdmin;
  if (updates.notificationNewMessage !== undefined) row.notification_new_message = updates.notificationNewMessage;
  if (updates.notificationNewEvent !== undefined) row.notification_new_event = updates.notificationNewEvent;
  if (updates.notificationNewMatch !== undefined) row.notification_new_match = updates.notificationNewMatch;
  if (updates.notificationEventUpdate !== undefined) row.notification_event_update = updates.notificationEventUpdate;
  return row;
}
