export type EventCategory =
  | 'networking'
  | 'tournament'
  | 'social'
  | 'workshop'
  | 'mixer'
  | 'charity';

export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export interface ClubEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  status: EventStatus;
  date: string;
  startTime: string;
  endTime: string;
  endDateISO: string | null;
  registrationDeadline: string | null;
  location: string;
  address: string | null;
  organizerId: string;
  maxAttendees: number | null;
  attendeeIds: string[];
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
