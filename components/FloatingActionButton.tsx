import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../lib/theme/store';

interface FloatingActionButtonProps {
  href?: string;
  onPress?: () => void;
}

/**
 * Floating action button with + icon for adding items.
 * Positioned at the bottom right of the screen.
 */
export function FloatingActionButton({ href, onPress }: FloatingActionButtonProps) {
  const router = useRouter();
  const colors = useColors();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (href) {
      router.push(href);
    }
  };

  return (
    <TouchableOpacity
      style={{
        position: 'absolute',
        bottom: 48,
        right: 36,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.background,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
      }}
      onPress={handlePress}
    >
      <Ionicons name="add" size={28} color="#FFFFFF" />
    </TouchableOpacity>
  );
}
