import { useState } from 'react';
import { Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { CURRENCY_OPTIONS } from '../lib/utils/format';
import { useColors } from '../lib/theme/store';

interface CurrencySelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function CurrencySelect({ value, onChange }: CurrencySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const colors = useColors();

  const selectedOption = CURRENCY_OPTIONS.find((opt) => opt.value === value);

  const handleSelect = (currency: string) => {
    onChange(currency);
    setIsOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setIsOpen(true)}
        style={{
          backgroundColor: colors.inputBackground,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <XStack alignItems="center" gap={12}>
          <Text color={colors.text} fontSize={17} fontWeight="600">
            {value}
          </Text>
          {selectedOption?.label && (
            <Text color={colors.textTertiary} fontSize={15}>
              {selectedOption.label}
            </Text>
          )}
        </XStack>
        <Ionicons name="chevron-down" size={20} color={colors.textTertiary} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: colors.overlay }}
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
                backgroundColor={colors.modalBackground}
                borderRadius={14}
                overflow="hidden"
                maxHeight={400}
              >
                <YStack padding={16} borderBottomWidth={1} borderBottomColor={colors.modalBorder}>
                  <Text color={colors.text} fontSize={17} fontWeight="600" textAlign="center">
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
                        borderBottomColor: colors.modalBorder,
                        backgroundColor: value === option.value ? colors.modalBorder : 'transparent',
                      }}
                    >
                      <XStack alignItems="center" gap={12}>
                        <Text
                          color={colors.text}
                          fontSize={17}
                          fontWeight={value === option.value ? '600' : '400'}
                        >
                          {option.value}
                        </Text>
                        <Text color={colors.textSecondary} fontSize={15}>
                          {option.label}
                        </Text>
                      </XStack>
                      {value === option.value && (
                        <Ionicons name="checkmark" size={22} color={colors.accent} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </YStack>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsOpen(false)}
                style={{
                  backgroundColor: colors.modalBackground,
                  borderRadius: 14,
                  marginTop: 8,
                  padding: 16,
                  alignItems: 'center',
                }}
              >
                <Text color={colors.accent} fontSize={17} fontWeight="600">
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
