import { TouchableOpacity } from 'react-native';
import { XStack, Text } from 'tamagui';

interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <XStack backgroundColor="#1F1F1F" borderRadius={6} padding={2}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          activeOpacity={0.7}
          onPress={() => onChange(option.value)}
          style={{
            backgroundColor: value === option.value ? '#007AFF' : 'transparent',
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderRadius: 4,
          }}
        >
          <Text
            color={value === option.value ? '#FFFFFF' : '#8E8E93'}
            fontSize={12}
            fontWeight="600"
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </XStack>
  );
}
