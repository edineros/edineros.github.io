import { ReactNode } from 'react';
import { YStack, XStack, Text } from 'tamagui';

interface LabeledElementProps {
  label?: string;
  labelRight?: ReactNode;
  children: ReactNode;
}

export function LabeledElement({ label, labelRight, children }: LabeledElementProps) {
  if (!label && !labelRight) {
    return <>{children}</>;
  }

  return (
    <YStack gap={8}>
      <XStack justifyContent="space-between" alignItems="center">
        {label && (
          <Text color="#8E8E93" fontSize={13} fontWeight="600">
            {label.toUpperCase()}
          </Text>
        )}
        {labelRight}
      </XStack>
      {children}
    </YStack>
  );
}
