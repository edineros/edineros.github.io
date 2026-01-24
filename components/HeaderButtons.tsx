import { Pressable } from 'react-native';
import { Link } from 'expo-router';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Consistent spacing for header buttons (matches main content padding of 16px)
const HEADER_BUTTON_STYLES = {
  left: {
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 8,
  },
  right: {
    paddingLeft: 16,
    paddingRight: 8,
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
  return (
    <Pressable
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
      <Ionicons name="chevron-back" size={HEADER_BUTTON_STYLES.backIconSize} color="#007AFF" />
    </Pressable>
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
 * Icon button for header. Can be used with onPress or href (Link).
 */
export function HeaderIconButton({
  icon,
  color = '#007AFF',
  onPress,
  href,
  position = 'right',
}: HeaderIconButtonProps) {
  const style = position === 'left' ? HEADER_BUTTON_STYLES.left : HEADER_BUTTON_STYLES.right;

  const button = (
    <Pressable
      onPress={onPress}
      style={style}
      hitSlop={HEADER_BUTTON_STYLES.hitSlop}
    >
      <Ionicons name={icon} size={HEADER_BUTTON_STYLES.iconSize} color={color} />
    </Pressable>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        {button}
      </Link>
    );
  }

  return button;
}
