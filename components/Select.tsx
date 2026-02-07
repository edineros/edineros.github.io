import { useState, ReactNode } from 'react';
import { Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../lib/theme/store';

export interface SelectOption<T = string> {
  value: T;
  label: string;
  sublabel?: string;
  icon?: ReactNode;
}

interface SelectProps<T = string> {
  value: T | null;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  title?: string;
  allowNull?: boolean;
  nullLabel?: string;
}

export function Select<T extends string | null = string>({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  title = 'Select',
  allowNull = false,
  nullLabel = 'None',
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const colors = useColors();

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (newValue: T) => {
    onChange(newValue);
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
        <XStack alignItems="center" gap={12} flex={1}>
          {selectedOption?.icon}
          {selectedOption ? (
            <>
              <Text color={colors.text} fontSize={17} fontWeight="600">
                {selectedOption.label}
              </Text>
              {selectedOption.sublabel && (
                <Text color={colors.textTertiary} fontSize={15}>
                  {selectedOption.sublabel}
                </Text>
              )}
            </>
          ) : (
            <Text color={colors.textTertiary} fontSize={17}>
              {placeholder}
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
          activeOpacity={1}
        >
          <YStack
            flex={1}
            justifyContent="flex-end"
            paddingHorizontal={16}
            paddingBottom={Platform.OS === 'web' ? 40 : 34}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <YStack
                backgroundColor={colors.modalBackground}
                borderRadius={14}
                overflow="hidden"
                maxHeight={400}
              >
                <YStack padding={16} borderBottomWidth={1} borderBottomColor={colors.modalBorder}>
                  <Text color={colors.text} fontSize={17} fontWeight="600" textAlign="center">
                    {title}
                  </Text>
                </YStack>
                <ScrollView style={{ maxHeight: 300 }}>
                  {allowNull && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleSelect(null as T)}
                      style={{
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottomWidth: options.length > 0 ? 1 : 0,
                        borderBottomColor: colors.modalBorder,
                        backgroundColor: value === null ? colors.modalBorder : 'transparent',
                      }}
                    >
                      <Text
                        color={colors.textSecondary}
                        fontSize={17}
                        fontWeight={value === null ? '600' : '400'}
                        fontStyle="italic"
                      >
                        {nullLabel}
                      </Text>
                      {value === null && (
                        <Ionicons name="checkmark" size={22} color={colors.accent} />
                      )}
                    </TouchableOpacity>
                  )}
                  {options.map((option, index) => (
                    <TouchableOpacity
                      key={String(option.value)}
                      activeOpacity={0.7}
                      onPress={() => handleSelect(option.value as T)}
                      style={{
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottomWidth: index < options.length - 1 ? 1 : 0,
                        borderBottomColor: colors.modalBorder,
                        backgroundColor: value === option.value ? colors.modalBorder : 'transparent',
                      }}
                    >
                      <XStack alignItems="center" gap={12} flex={1}>
                        {option.icon}
                        <Text
                          color={colors.text}
                          fontSize={17}
                          fontWeight={value === option.value ? '600' : '400'}
                        >
                          {option.label}
                        </Text>
                        {option.sublabel && (
                          <Text color={colors.textSecondary} fontSize={15}>
                            {option.sublabel}
                          </Text>
                        )}
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
