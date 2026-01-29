import { useState } from 'react';
import { Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
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
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setIsOpen(true)}
        style={{
          backgroundColor: '#111111',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#1F1F1F',
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
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
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onPress={() => setIsOpen(false)}
        >
          <YStack
            flex={1}
            justifyContent="flex-end"
            paddingHorizontal={16}
            paddingBottom={Platform.OS === 'web' ? 40 : 34}
          >
            <TouchableOpacity onPress={(e) => e.stopPropagation()}>
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
                    <TouchableOpacity
                      key={option.value}
                      activeOpacity={0.7}
                      onPress={() => handleSelect(option.value)}
                      style={{
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottomWidth: index < CURRENCY_OPTIONS.length - 1 ? 1 : 0,
                        borderBottomColor: '#2C2C2E',
                        backgroundColor: value === option.value ? '#2C2C2E' : 'transparent',
                      }}
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
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </YStack>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsOpen(false)}
                style={{
                  backgroundColor: '#1C1C1E',
                  borderRadius: 14,
                  marginTop: 8,
                  padding: 16,
                  alignItems: 'center',
                }}
              >
                <Text color="#007AFF" fontSize={17} fontWeight="600">
                  Cancel
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </YStack>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
