import { YStack } from 'tamagui';
import { ScreenHeader } from './ScreenHeader';
import { useColors } from '../lib/theme/store';

interface PageProps {
  // Header props
  title?: string;
  titleComponent?: React.ReactNode;
  showBack?: boolean;
  fallbackPath?: string;
  leftComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
  // Content
  children: React.ReactNode;
}

export function Page({
  title,
  titleComponent,
  showBack = true,
  fallbackPath,
  leftComponent,
  rightComponent,
  children,
}: PageProps) {
  const colors = useColors();

  return (
    <YStack flex={1} backgroundColor={colors.background}>
      <ScreenHeader
        title={title}
        titleComponent={titleComponent}
        showBack={showBack}
        fallbackPath={fallbackPath}
        leftComponent={leftComponent}
        rightComponent={rightComponent}
      />
      {children}
    </YStack>
  );
}
