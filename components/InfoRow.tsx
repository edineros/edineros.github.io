import { ReactNode } from 'react';
import { XStack, Text } from 'tamagui';

interface InfoRowProps {
  label: string;
  value: ReactNode;
  valueColor?: string;
  bold?: boolean;
}

export function InfoRow({ label, value, valueColor = '#FFFFFF', bold = false }: InfoRowProps) {
  return (
    <XStack justifyContent="space-between" alignItems="center">
      <Text color="#8E8E93" fontSize={bold ? 15 : 13} fontWeight={bold ? '600' : '400'}>
        {label}
      </Text>
      <Text color={valueColor} fontSize={bold ? 17 : 14} fontWeight={bold ? '700' : '500'}>
        {value}
      </Text>
    </XStack>
  );
}
