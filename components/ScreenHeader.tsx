import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { XStack, Text, View } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../lib/theme/store';

interface ScreenHeaderProps {
  title?: string;
  titleComponent?: React.ReactNode;
  showBack?: boolean;
  fallbackPath?: string;
  leftComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
}

export function ScreenHeader({
  title,
  titleComponent,
  showBack = false,
  fallbackPath = '/',
  leftComponent,
  rightComponent,
}: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackPath);
    }
  };

  return (
    <View paddingTop={insets.top} backgroundColor={colors.background}>
      <XStack
        height={44}
        alignItems="center"
        justifyContent="center"
        paddingHorizontal={8}
      >
        {/* Left side - back button, custom component, or spacer */}
        <View width={60} alignItems="flex-start">
          {showBack ? (
            <TouchableOpacity
              onPress={handleBack}
              style={{ paddingHorizontal: 8, paddingVertical: 8 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={28} color={colors.accent} />
            </TouchableOpacity>
          ) : leftComponent}
        </View>

        {/* Center - title */}
        <View flex={1} alignItems="center" justifyContent="center">
          {titleComponent || (
            <Text color={colors.text} fontSize={17} fontWeight="600" numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>

        {/* Right side - actions or spacer */}
        <View width={60} alignItems="flex-end">
          {rightComponent}
        </View>
      </XStack>
    </View>
  );
}
