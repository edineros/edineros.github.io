import { ReactNode } from 'react';
import { Text } from 'tamagui';

interface InfoLabelProps {
  children: ReactNode;
}

export function InfoLabel({ children }: InfoLabelProps) {
  return (
    <Text fontSize={17} fontWeight="600" color="#FFFFFF">
      {children}
    </Text>
  );
}
