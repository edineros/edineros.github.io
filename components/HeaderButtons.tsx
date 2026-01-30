import { TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../lib/theme/store';

// Consistent spacing for header buttons (matches main content padding of 16px)
const HEADER_BUTTON_STYLES = {
  left: {
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 8,
  },
  right: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 8,
  },
  hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
  iconSize: 24,
  backIconSize: 28,
};

interface HeaderBackButtonProps {
  fallbackPath?: string;
}

/**
 * Back button for header left position.
 * Handles both navigation history and fallback for direct URL access.
 */
export function HeaderBackButton({ fallbackPath = '/' }: HeaderBackButtonProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace(fallbackPath);
        }
      }}
      style={HEADER_BUTTON_STYLES.left}
      hitSlop={HEADER_BUTTON_STYLES.hitSlop}
    >
      <Ionicons name="chevron-back" size={HEADER_BUTTON_STYLES.backIconSize} color={colors.accent} />
    </TouchableOpacity>
  );
}

interface HeaderIconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress?: () => void;
  href?: string;
  position?: 'left' | 'right';
}

/**
 * Icon button for header. Can be used with onPress or href.
 */
export function HeaderIconButton({
  icon,
  color,
  onPress,
  href,
  position = 'right',
}: HeaderIconButtonProps) {
  const colors = useColors();
  const resolvedColor = color ?? colors.accent;
  const style = position === 'left' ? HEADER_BUTTON_STYLES.left : HEADER_BUTTON_STYLES.right;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (href) {
      router.push(href);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={style}
      hitSlop={HEADER_BUTTON_STYLES.hitSlop}
    >
      <Ionicons name={icon} size={HEADER_BUTTON_STYLES.iconSize} color={resolvedColor} />
    </TouchableOpacity>
  );
}
