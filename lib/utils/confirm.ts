import { Alert, Platform } from 'react-native';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

/**
 * Cross-platform confirmation dialog.
 * Uses Alert.alert on native and window.confirm on web.
 */
/**
 * Cross-platform alert dialog.
 * Uses Alert.alert on native and window.alert on web.
 */
export function alert(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

export function confirm(options: ConfirmOptions): Promise<boolean> {
  const {
    title,
    message,
    confirmText = 'OK',
    cancelText = 'Cancel',
    destructive = false,
  } = options;

  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      // On web, use window.confirm
      const result = window.confirm(`${title}\n\n${message}`);
      resolve(result);
    } else {
      // On native, use Alert.alert
      Alert.alert(
        title,
        message,
        [
          { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
          {
            text: confirmText,
            style: destructive ? 'destructive' : 'default',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    }
  });
}
