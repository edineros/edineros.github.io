import { ReactNode } from 'react';
import { YStack, Text } from 'tamagui';
import { useColors } from '../lib/theme/store';
import { CONTENT_HORIZONTAL_PADDING } from '../lib/constants/layout';

interface SettingsSectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function SettingsSection({ title, subtitle, children }: SettingsSectionProps) {
  const colors = useColors();

  return (
    <YStack
      backgroundColor={colors.card}
      borderRadius={12}
      borderWidth={1}
      borderColor={colors.cardBorder}
      padding={CONTENT_HORIZONTAL_PADDING}
    >
      <Text color={colors.text} fontSize={20} fontWeight="600" marginBottom={12}>
        {title}
      </Text>
      {subtitle && (
        <Text color={colors.textSecondary} fontSize={15} marginBottom={16}>
          {subtitle}
        </Text>
      )}
      {children}
    </YStack>
  );
}
