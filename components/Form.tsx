import { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { YStack } from 'tamagui';

interface FormProps {
  children: ReactNode;
  footer?: ReactNode;
}

export function Form({ children, footer }: FormProps) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <YStack flex={1} padding={16} gap={24} justifyContent="space-between">
        <YStack gap={24}>{children}</YStack>
        {footer && <YStack paddingBottom={24}>{footer}</YStack>}
      </YStack>
    </ScrollView>
  );
}
