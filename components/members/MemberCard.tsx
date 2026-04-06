import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { Member } from '@/types';
import { MemberAvatar } from './MemberAvatar';
import { getFullName } from '@/utils/formatters';

interface MemberCardProps {
  member: Member;
}

export function MemberCard({ member }: MemberCardProps) {
  const isDeactivated = member.isActive === false;
  return (
    <Card
      style={[styles.card, isDeactivated && styles.cardDeactivated]}
      onPress={() => router.push(`/directory/${member.id}`)}>
      <Card.Content style={styles.content}>
        <View style={isDeactivated ? { opacity: 0.5 } : undefined}>
          <MemberAvatar
            firstName={member.firstName}
            lastName={member.lastName}
            avatarUrl={member.avatarUrl}
            size={52}
          />
        </View>
        <View style={styles.info}>
          <Text variant="titleMedium" numberOfLines={1} style={isDeactivated ? { opacity: 0.5 } : undefined}>
            {getFullName(member.firstName, member.lastName)}
            {isDeactivated ? ' (deaktiveret)' : ''}
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, isDeactivated && { opacity: 0.5 }]} numberOfLines={1}>
            {member.jobTitle}{member.companyName ? ` hos ${member.companyName}` : ''}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  info: {
    flex: 1,
  },
  subtitle: {
    color: '#757575',
    marginTop: 2,
  },
  cardDeactivated: {
    backgroundColor: '#F5F5F5',
    borderLeftWidth: 3,
    borderLeftColor: '#D32F2F',
  },
});
