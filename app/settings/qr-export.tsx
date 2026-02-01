import { useState, useEffect, useCallback } from 'react';
import { Dimensions } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import QRCode from 'react-native-qrcode-svg';
import { Page } from '../../components/Page';
import { LongButton } from '../../components/LongButton';
import { useColors } from '../../lib/theme/store';
import { CONTENT_HORIZONTAL_PADDING } from '../../lib/constants/layout';
import { encodeForQR } from '../../lib/utils/qrData';
import { exportAllData } from '../../lib/utils/export';

const ANIMATION_INTERVAL_MS = 500; // Time per QR code frame

export default function QRExportScreen() {
  const colors = useColors();
  const [chunks, setChunks] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const screenWidth = Dimensions.get('window').width;
  const qrSize = Math.min(screenWidth - CONTENT_HORIZONTAL_PADDING * 4, 300);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await exportAllData();
      const jsonString = JSON.stringify(data);
      const encoded = encodeForQR(jsonString);
      setChunks(encoded);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isPlaying || chunks.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % chunks.length);
    }, ANIMATION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isPlaying, chunks.length]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + chunks.length) % chunks.length);
  }, [chunks.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % chunks.length);
  }, [chunks.length]);

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  if (isLoading) {
    return (
      <Page title="Export via QR" fallbackPath="/settings">
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Text color={colors.textSecondary}>Preparing export data...</Text>
        </YStack>
      </Page>
    );
  }

  if (error) {
    return (
      <Page title="Export via QR" fallbackPath="/settings">
        <YStack flex={1} padding={CONTENT_HORIZONTAL_PADDING} justifyContent="center" alignItems="center" gap={16}>
          <Text color={colors.loss} textAlign="center">
            Failed to prepare export: {error}
          </Text>
          <LongButton onPress={loadData}>Try Again</LongButton>
        </YStack>
      </Page>
    );
  }

  return (
    <Page title="Export via QR" fallbackPath="/settings">
      <YStack flex={1} padding={CONTENT_HORIZONTAL_PADDING} gap={24}>
        <Text color={colors.textSecondary} textAlign="center" fontSize={15}>
          Open the scanner on your other device and point it at these QR codes.
        </Text>

        {/* QR Code Display */}
        <YStack alignItems="center" gap={16}>
          <YStack
            backgroundColor="#FFFFFF"
            padding={16}
            borderRadius={12}
          >
            {chunks.length > 0 && (
              <QRCode
                value={chunks[currentIndex]}
                size={qrSize}
                backgroundColor="#FFFFFF"
                color="#000000"
              />
            )}
          </YStack>

          {/* Progress indicator */}
          <Text color={colors.text} fontSize={17} fontWeight="600">
            {currentIndex + 1} / {chunks.length}
          </Text>

          {/* Progress bar */}
          <XStack width="100%" height={4} backgroundColor={colors.backgroundTertiary} borderRadius={2}>
            <YStack
              width={`${((currentIndex + 1) / chunks.length) * 100}%`}
              height="100%"
              backgroundColor={colors.accent}
              borderRadius={2}
            />
          </XStack>
        </YStack>

        {/* Controls */}
        <YStack gap={12}>
          <XStack gap={12}>
            <YStack flex={1}>
              <LongButton onPress={handlePrevious} variant="secondary">
                Previous
              </LongButton>
            </YStack>
            <YStack flex={1}>
              <LongButton onPress={togglePlayPause}>
                {isPlaying ? 'Pause' : 'Play'}
              </LongButton>
            </YStack>
            <YStack flex={1}>
              <LongButton onPress={handleNext} variant="secondary">
                Next
              </LongButton>
            </YStack>
          </XStack>
        </YStack>

        <Text color={colors.textTertiary} textAlign="center" fontSize={13}>
          Keep scanning until all {chunks.length} codes are captured.
        </Text>
      </YStack>
    </Page>
  );
}
