import { ReactNode, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../lib/theme/store';
import { CONTENT_HORIZONTAL_PADDING } from '../lib/constants/layout';

interface SettingsSectionProps {
  title: string;
  subtitle?: string;
  /** If set (true or false), section is collapsible. Value is initial collapsed state. */
  collapsed?: boolean;
  children: ReactNode;
}

export function SettingsSection({ title, subtitle, collapsed, children }: SettingsSectionProps) {
  const colors = useColors();
  const collapsible = collapsed !== undefined;
  const [isCollapsed, setIsCollapsed] = useState(collapsed ?? false);

  const showChildren = collapsible ? !isCollapsed : true;

  const headerContent = (
    <XStack justifyContent="space-between" alignItems="flex-start" gap={12}>
      <YStack flex={1} flexShrink={1}>
        <Text color={colors.text} fontSize={20} fontWeight="600">
          {title}
        </Text>
        {subtitle && (
          <Text color={colors.textSecondary} fontSize={15} marginTop={8}>
            {subtitle}
          </Text>
        )}
      </YStack>
      {collapsible && (
        <Ionicons
          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
          size={20}
          color={colors.textSecondary}
          style={{ marginTop: 4 }}
        />
      )}
    </XStack>
  );

  return (
    <YStack
      backgroundColor={colors.card}
      borderRadius={12}
      borderWidth={1}
      borderColor={colors.cardBorder}
      padding={CONTENT_HORIZONTAL_PADDING}
    >
      {collapsible ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setIsCollapsed(!isCollapsed)}
        >
          {headerContent}
        </TouchableOpacity>
      ) : (
        headerContent
      )}
      {showChildren && (
        <YStack marginTop={16}>
          {children}
        </YStack>
      )}
    </YStack>
  );
}
