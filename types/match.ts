export type SportType = 'tennis' | 'padel';
export type MatchFormat = 'singles' | 'singles_mix' | 'doubles' | 'mixed';
export type MatchStatus = 'open' | 'full' | 'completed' | 'cancelled';

export interface Match {
  id: string;
  sport: SportType;
  format: MatchFormat;
  status: MatchStatus;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  levelMin: number;
  levelMax: number;
  maxPlayers: number;
  playerIds: string[];
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}
