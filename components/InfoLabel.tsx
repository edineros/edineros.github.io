import { ReactNode } from 'react';
import { Text } from 'tamagui';
import { useColors } from '../lib/theme/store';

interface InfoLabelProps {
  children: ReactNode;
}

export function InfoLabel({ children }: InfoLabelProps) {
  const colors = useColors();

  return (
    <Text fontSize={17} fontWeight="600" color={colors.text}>
      {children}
    </Text>
  );
}
