import { useState } from 'react';
import { Modal, Pressable, ScrollView, Platform } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { CURRENCY_OPTIONS } from '../lib/utils/format';

interface CurrencySelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function CurrencySelect({ value, onChange, label }: CurrencySelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = CURRENCY_OPTIONS.find((opt) => opt.value === value);

  const handleSelect = (currency: string) => {
    onChange(currency);
    setIsOpen(false);
  };

  return (
    <>
      {label && (
        <Text color="#8E8E93" fontSize={13} fontWeight="600" marginBottom={8}>
          {label}
        </Text>
      )}
      <Pressable onPress={() => setIsOpen(true)}>
        <XStack
          backgroundColor="#111111"
          borderRadius={12}
          borderWidth={1}
          borderColor="#1F1F1F"
          padding={16}
          alignItems="center"
          justifyContent="space-between"
        >
          <XStack alignItems="center" gap={12}>
            <Text color="#FFFFFF" fontSize={17} fontWeight="600">
              {value}
            </Text>
            {selectedOption?.label && (
              <Text color="#636366" fontSize={15}>
                {selectedOption.label}
              </Text>
            )}
          </XStack>
          <Ionicons name="chevron-down" size={20} color="#636366" />
        </XStack>
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onPress={() => setIsOpen(false)}
        >
          <YStack
            flex={1}
            justifyContent="flex-end"
            paddingHorizontal={16}
            paddingBottom={Platform.OS === 'web' ? 40 : 34}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <YStack
                backgroundColor="#1C1C1E"
                borderRadius={14}
                overflow="hidden"
                maxHeight={400}
              >
                <YStack padding={16} borderBottomWidth={1} borderBottomColor="#2C2C2E">
                  <Text color="#FFFFFF" fontSize={17} fontWeight="600" textAlign="center">
                    Select Currency
                  </Text>
                </YStack>
                <ScrollView style={{ maxHeight: 300 }}>
                  {CURRENCY_OPTIONS.map((option, index) => (
                    <Pressable
                      key={option.value}
                      onPress={() => handleSelect(option.value)}
                    >
                      <XStack
                        padding={16}
                        alignItems="center"
                        justifyContent="space-between"
                        borderBottomWidth={index < CURRENCY_OPTIONS.length - 1 ? 1 : 0}
                        borderBottomColor="#2C2C2E"
                        backgroundColor={value === option.value ? '#2C2C2E' : 'transparent'}
                      >
                        <XStack alignItems="center" gap={12}>
                          <Text
                            color="#FFFFFF"
                            fontSize={17}
                            fontWeight={value === option.value ? '600' : '400'}
                          >
                            {option.value}
                          </Text>
                          <Text color="#8E8E93" fontSize={15}>
                            {option.label}
                          </Text>
                        </XStack>
                        {value === option.value && (
                          <Ionicons name="checkmark" size={22} color="#007AFF" />
                        )}
                      </XStack>
                    </Pressable>
                  ))}
                </ScrollView>
              </YStack>
              <Pressable onPress={() => setIsOpen(false)}>
                <YStack
                  backgroundColor="#1C1C1E"
                  borderRadius={14}
                  marginTop={8}
                  padding={16}
                  alignItems="center"
                >
                  <Text color="#007AFF" fontSize={17} fontWeight="600">
                    Cancel
                  </Text>
                </YStack>
              </Pressable>
            </Pressable>
          </YStack>
        </Pressable>
      </Modal>
    </>
  );
}
