import { Avatar } from 'react-native-paper';
import { getInitials } from '@/utils/formatters';
import { colors } from '@/theme';

interface MemberAvatarProps {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  size?: number;
}

export function MemberAvatar({ firstName, lastName, avatarUrl, size = 48 }: MemberAvatarProps) {
  if (avatarUrl) {
    return <Avatar.Image size={size} source={{ uri: avatarUrl }} />;
  }
  return (
    <Avatar.Text
      size={size}
      label={getInitials(firstName, lastName)}
      style={{ backgroundColor: colors.primary }}
      color={colors.onPrimary}
    />
  );
}
