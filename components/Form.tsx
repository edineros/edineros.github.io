import { ReactNode } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { YStack } from 'tamagui';

interface FormProps {
  children: ReactNode;
  footer?: ReactNode;
}

export function Form({ children, footer }: FormProps) {
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
          backgroundColor="#000000"
          borderTopWidth={1}
          borderTopColor="#1F1F1F"
        >
          {footer}
        </YStack>
      )}
    </KeyboardAvoidingView>
  );
}
