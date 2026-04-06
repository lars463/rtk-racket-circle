import { Member } from '@/types';

export function searchMembers(members: Member[], query: string): Member[] {
  const lower = query.toLowerCase().trim();
  if (!lower) return members;
  return members.filter(
    (m) =>
      m.firstName.toLowerCase().includes(lower) ||
      m.lastName.toLowerCase().includes(lower) ||
      m.companyName.toLowerCase().includes(lower) ||
      m.jobTitle.toLowerCase().includes(lower)
  );
}
