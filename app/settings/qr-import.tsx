import { useState, useEffect, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text } from 'tamagui';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Page } from '../../components/Page';
import { LongButton } from '../../components/LongButton';
import { useColors } from '../../lib/theme/store';
import { CONTENT_HORIZONTAL_PADDING } from '../../lib/constants/layout';
import { parseQRChunk, reassembleChunks } from '../../lib/utils/qrData';
import { importFromJson } from '../../lib/utils/export';
import { alert, alertAsync, confirm } from '../../lib/utils/confirm';
import { useAppStore } from '../../store';

export default function QRImportScreen() {
  const colors = useColors();
  const router = useRouter();
  const { loadPortfolios } = useAppStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [chunks, setChunks] = useState<Map<number, string>>(new Map());
  const [totalChunks, setTotalChunks] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const lastScannedRef = useRef<string>('');

  const scannedCount = chunks.size;
  const progress = totalChunks ? (scannedCount / totalChunks) * 100 : 0;

  useEffect(() => {
    if (totalChunks && scannedCount === totalChunks && !isComplete) {
      handleImportComplete();
    }
  }, [scannedCount, totalChunks, isComplete]);

  const handleImportComplete = async () => {
    if (!totalChunks) {
      return;
    }

    setIsComplete(true);

    const jsonData = reassembleChunks(chunks, totalChunks);
    if (!jsonData) {
      alert('Import Failed', 'Failed to reassemble data. Please try again.');
      resetScanner();
      return;
    }

    const confirmed = await confirm({
      title: 'Import Data?',
      message: 'This will replace all existing portfolios, assets, and transactions. This action cannot be undone.',
      confirmText: 'Import',
      cancelText: 'Cancel',
      destructive: true,
    });

    if (!confirmed) {
      resetScanner();
      return;
    }

    setIsImporting(true);
    try {
      const result = await importFromJson(jsonData);
      await loadPortfolios();
      await alertAsync(
        'Import Successful',
        `Imported:\n- ${result.portfoliosImported} portfolios\n- ${result.assetsImported} assets\n- ${result.transactionsImported} transactions`
      );
      router.replace('/');
    } catch (error) {
      alert('Import Failed', (error as Error).message);
      resetScanner();
    } finally {
      setIsImporting(false);
    }
  };

  const resetScanner = () => {
    setChunks(new Map());
    setTotalChunks(null);
    setIsComplete(false);
    lastScannedRef.current = '';
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    // Avoid processing the same QR code repeatedly
    if (data === lastScannedRef.current || isComplete || isImporting) {
      return;
    }
    lastScannedRef.current = data;

    const chunk = parseQRChunk(data);
    if (!chunk) {
      return; // Not a valid portfolio QR code
    }

    // Set total chunks on first scan
    if (totalChunks === null) {
      setTotalChunks(chunk.total);
    } else if (chunk.total !== totalChunks) {
      // Mismatch - different export session
      alert('Scan Error', 'This QR code belongs to a different export. Please start over.');
      resetScanner();
      return;
    }

    // Add chunk if not already scanned
    if (!chunks.has(chunk.index)) {
      setChunks((prev) => {
        const next = new Map(prev);
        next.set(chunk.index, chunk.data);
        return next;
      });
    }
  };

  if (Platform.OS === 'web') {
    return (
      <Page title="Import via QR" fallbackPath="/settings">
        <YStack flex={1} padding={CONTENT_HORIZONTAL_PADDING} justifyContent="center" alignItems="center">
          <Text color={colors.textSecondary} textAlign="center">
            QR code import is not available on web.{'\n'}
            Please use the JSON import option instead.
          </Text>
        </YStack>
      </Page>
    );
  }

  if (!permission) {
    return (
      <Page title="Import via QR" fallbackPath="/settings">
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Text color={colors.textSecondary}>Requesting camera permission...</Text>
        </YStack>
      </Page>
    );
  }

  if (!permission.granted) {
    return (
      <Page title="Import via QR" fallbackPath="/settings">
        <YStack flex={1} padding={CONTENT_HORIZONTAL_PADDING} justifyContent="center" alignItems="center" gap={16}>
          <Text color={colors.textSecondary} textAlign="center">
            Camera access is required to scan QR codes.
          </Text>
          <LongButton onPress={requestPermission}>Grant Camera Access</LongButton>
        </YStack>
      </Page>
    );
  }

  return (
    <Page title="Import via QR" fallbackPath="/settings">
      <YStack flex={1}>
        {/* Camera View */}
        <YStack flex={1} position="relative">
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={handleBarcodeScanned}
          />

          {/* Overlay with scanning frame */}
          <YStack
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            justifyContent="center"
            alignItems="center"
          >
            <YStack
              width={250}
              height={250}
              borderWidth={2}
              borderColor="white"
              borderRadius={12}
              opacity={0.8}
            />
          </YStack>
        </YStack>

        {/* Progress Panel */}
        <YStack
          backgroundColor={colors.card}
          padding={CONTENT_HORIZONTAL_PADDING}
          paddingBottom={40}
          gap={12}
        >
          {isImporting ? (
            <Text color={colors.text} fontSize={17} fontWeight="600" textAlign="center">
              Importing data...
            </Text>
          ) : totalChunks === null ? (
            <Text color={colors.textSecondary} fontSize={15} textAlign="center">
              Point your camera at the QR codes on the exporting device.
            </Text>
          ) : (
            <>
              <XStack justifyContent="space-between" alignItems="center">
                <Text color={colors.text} fontSize={17} fontWeight="600">
                  Scanning Progress
                </Text>
                <Text color={colors.accent} fontSize={17} fontWeight="600">
                  {scannedCount} / {totalChunks}
                </Text>
              </XStack>

              {/* Progress bar */}
              <XStack
                width="100%"
                height={8}
                backgroundColor={colors.backgroundTertiary}
                borderRadius={4}
              >
                <YStack
                  width={`${progress}%`}
                  height="100%"
                  backgroundColor={colors.accent}
                  borderRadius={4}
                />
              </XStack>

              <Text color={colors.textSecondary} fontSize={13} textAlign="center">
                {scannedCount === totalChunks
                  ? 'All codes scanned! Processing...'
                  : 'Keep scanning to capture all codes.'}
              </Text>
            </>
          )}

          {totalChunks !== null && !isImporting && (
            <LongButton onPress={resetScanner} variant="secondary">
              Start Over
            </LongButton>
          )}
        </YStack>
      </YStack>
    </Page>
  );
}
