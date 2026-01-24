import { Pressable, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface FloatingActionButtonProps {
  href: string;
}

/**
 * Floating action button with + icon for adding items.
 * Positioned at the bottom right of the screen.
 */
export function FloatingActionButton({ href }: FloatingActionButtonProps) {
  return (
    <Link href={href} asChild>
      <Pressable style={styles.button}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
