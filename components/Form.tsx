import { ReactNode } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { YStack } from 'tamagui';
import { useColors } from '../lib/theme/store';

interface FormProps {
  children: ReactNode;
  footer?: ReactNode;
}

export function Form({ children, footer }: FormProps) {
  const colors = useColors();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: footer ? 16 : 0 }}
        keyboardShouldPersistTaps="handled"
      >
        <YStack flex={1} padding={16} gap={24}>
          {children}
        </YStack>
      </ScrollView>
      {footer && (
        <YStack
          padding={16}
          paddingBottom={24}
          backgroundColor={colors.background}
          borderTopWidth={1}
          borderTopColor={colors.border}
        >
          {footer}
        </YStack>
      )}
    </KeyboardAvoidingView>
  );
}
