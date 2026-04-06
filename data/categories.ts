import { SkillCategory, EventCategory, PlayLevel, PadelLevel, SportType, MatchFormat } from '@/types';

export const skillCategoryLabels: Record<SkillCategory, string> = {
  finance: 'Finans',
  legal: 'Jura',
  technology: 'Teknologi',
  marketing: 'Marketing',
  'real-estate': 'Ejendom',
  healthcare: 'Sundhed',
  consulting: 'Rådgivning',
  hospitality: 'Hospitality',
  education: 'Uddannelse',
  other: 'Andet',
};

export const eventCategoryLabels: Record<EventCategory, string> = {
  networking: 'Netværk',
  tournament: 'Turnering',
  social: 'Socialt',
  workshop: 'Workshop',
  mixer: 'Mixer',
  charity: 'Velgørenhed',
};

export const skillCategoryColors: Record<SkillCategory, string> = {
  finance: '#1565C0',
  legal: '#6A1B9A',
  technology: '#00838F',
  marketing: '#EF6C00',
  'real-estate': '#2E7D32',
  healthcare: '#C62828',
  consulting: '#37474F',
  hospitality: '#AD1457',
  education: '#283593',
  other: '#757575',
};

export const playLevelLabels: Record<PlayLevel, string> = {
  1: '1.0',
  1.5: '1.5',
  2: '2.0',
  2.5: '2.5',
  3: '3.0',
  3.5: '3.5',
  4: '4.0',
  4.5: '4.5',
  5: '5.0',
};

export const padelLevelLabels: Record<PadelLevel, string> = {
  1: '1.0',
  1.5: '1.5',
  2: '2.0',
  2.5: '2.5',
  3: '3.0',
  3.5: '3.5',
  4: '4.0',
  4.5: '4.5',
  5: '5.0',
};

export const sportTypeLabels: Record<SportType, string> = {
  tennis: 'Tennis',
  padel: 'Padel',
};

export const matchFormatLabels: Record<MatchFormat, string> = {
  singles: 'Single',
  singles_mix: 'Single (mix)',
  doubles: 'Double',
  mixed: 'Mixdouble',
};
