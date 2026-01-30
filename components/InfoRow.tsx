import { ReactNode } from 'react';
import { XStack, Text } from 'tamagui';
import { useColors } from '../lib/theme/store';

interface InfoRowProps {
  label: string;
  value: ReactNode;
  valueColor?: string;
  bold?: boolean;
}

export function InfoRow({ label, value, valueColor, bold = false }: InfoRowProps) {
  const colors = useColors();
  const resolvedValueColor = valueColor ?? colors.text;

  return (
    <XStack justifyContent="space-between" alignItems="center">
      <Text color={colors.textSecondary} fontSize={bold ? 15 : 13} fontWeight={bold ? '600' : '400'}>
        {label}
      </Text>
      <Text color={resolvedValueColor} fontSize={bold ? 17 : 14} fontWeight={bold ? '700' : '500'}>
        {value}
      </Text>
    </XStack>
  );
}
