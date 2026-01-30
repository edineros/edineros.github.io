import { TouchableOpacity } from 'react-native';
import { Text } from 'tamagui';
import { useColors } from '../lib/theme/store';

interface TextButtonProps {
  onPress: () => void;
  children: string;
  color?: string;
}

export function TextButton({ onPress, children, color }: TextButtonProps) {
  const colors = useColors();
  const resolvedColor = color ?? colors.accent;

  return (
    <TouchableOpacity onPress={onPress}>
      <Text color={resolvedColor} fontSize={13} fontWeight="600">
        {children}
      </Text>
    </TouchableOpacity>
  );
}
