import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatTime(timeString: string): string {
  if (!timeString) return '';
  // Return HH:MM as-is (24-hour format)
  return timeString.slice(0, 5);
}

export function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  if (isToday(date)) {
    return format(date, 'HH:mm');
  }
  if (isYesterday(date)) {
    return 'I g\u00e5r';
  }
  return date.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
}

export function formatRelativeTime(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function getFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}
