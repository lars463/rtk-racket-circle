export type SkillCategory =
  | 'finance'
  | 'legal'
  | 'technology'
  | 'marketing'
  | 'real-estate'
  | 'healthcare'
  | 'consulting'
  | 'hospitality'
  | 'education'
  | 'other';

export type MembershipTier = 'standard' | 'premium' | 'founding';

export type PlayLevel = 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5;

export type PadelLevel = 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5;

export type Gender = 'male' | 'female';

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender | null;
  avatarUrl: string | null;
  email: string;
  phone: string;
  bio: string;
  companyName: string;
  jobTitle: string;
  industry: SkillCategory;
  businessDescription: string;
  website: string | null;
  linkedIn: string | null;
  memberSince: string;
  membershipTier: MembershipTier;
  playLevel: PlayLevel | null;
  padelLevel: PadelLevel | null;
  familyInRTK: string | null;
  familyPhotos: string[];
  rtkCompetencies: string | null;
  matchInterests: {
    padelDouble: boolean;
    padelMix: boolean;
    tennisDouble: boolean;
    tennisMix: boolean;
    tennisSingle: boolean;
    tennisSingleMix: boolean;
  };
  isAdmin?: boolean;
  isActive?: boolean;
  notificationNewMessage?: boolean;
  notificationNewEvent?: boolean;
  notificationNewMatch?: boolean;
  notificationEventUpdate?: boolean;
  createdAt: string;
  updatedAt: string;
}
