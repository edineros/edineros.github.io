import { TouchableOpacity } from 'react-native';
import { Text } from 'tamagui';

interface TextButtonProps {
  onPress: () => void;
  children: string;
  color?: string;
}

export function TextButton({ onPress, children, color = '#007AFF' }: TextButtonProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text color={color} fontSize={13} fontWeight="600">
        {children}
      </Text>
    </TouchableOpacity>
  );
}
