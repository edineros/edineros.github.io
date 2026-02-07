import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text } from 'tamagui';
import { useQueryClient } from '@tanstack/react-query';
import { Page } from '../../components/Page';
import { LongButton } from '../../components/LongButton';
import { useColors } from '../../lib/theme/store';
import { CONTENT_HORIZONTAL_PADDING } from '../../lib/constants/layout';
import { parseQRChunk, reassembleChunks } from '../../lib/utils/qrData';
import { importFromJson } from '../../lib/utils/export';
import { alert, alertAsync, confirm } from '../../lib/utils/confirm';

// Native camera imports (lazy loaded)
let CameraView: any;
let useCameraPermissions: any;

if (Platform.OS !== 'web') {
  const ExpoCamera = require('expo-camera');
  CameraView = ExpoCamera.CameraView;
  useCameraPermissions = ExpoCamera.useCameraPermissions;
}

// Web QR scanner component
function WebQRScanner({ onScan, isActive, onStop }: { onScan: (data: string) => void; isActive: boolean; onStop?: () => void }) {
  const scannerRef = useRef<any>(null);
  const isRunningRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const colors = useColors();

  const stopScanner = useCallback(async () => {
    if (scannerRef.current && isRunningRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Scanner might already be stopped
      }
      isRunningRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    if (!isActive) {
      stopScanner().then(() => onStop?.());
      return;
    }

    let mounted = true;

    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        if (!containerRef.current || !mounted) {
          return;
        }

        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText: string) => {
            onScan(decodedText);
          },
          () => {
            // Ignore scan failures
          }
        );
        isRunningRef.current = true;
      } catch (err) {
        console.error('QR Scanner error:', err);
        if (mounted) {
          setError('Failed to access camera. Please ensure camera permissions are granted.');
        }
      }
    };

    initScanner();

    return () => {
      mounted = false;
      stopScanner();
    };
  }, [isActive, onScan, stopScanner, onStop]);

  if (error) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding={CONTENT_HORIZONTAL_PADDING}>
        <Text color={colors.loss} textAlign="center">{error}</Text>
      </YStack>
    );
  }

  return (
    <div
      ref={containerRef}
      id="qr-reader"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    />
  );
}

// Native camera component
function NativeQRScanner({ onScan }: { onScan: (data: string) => void }) {
  const colors = useColors();
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Text color={colors.textSecondary}>Requesting camera permission...</Text>
      </YStack>
    );
  }

  if (!permission.granted) {
    return (
      <YStack flex={1} padding={CONTENT_HORIZONTAL_PADDING} justifyContent="center" alignItems="center" gap={16}>
        <Text color={colors.textSecondary} textAlign="center">
          Camera access is required to scan QR codes.
        </Text>
        <LongButton onPress={requestPermission}>Grant Camera Access</LongButton>
      </YStack>
    );
  }

  return (
    <YStack flex={1} position="relative">
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={({ data }: { data: string }) => onScan(data)}
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
  );
}

export default function QRImportScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [chunks, setChunks] = useState<Map<number, string>>(new Map());
  const [totalChunks, setTotalChunks] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [scannerActive, setScannerActive] = useState(true);
  const lastScannedRef = useRef<string>('');
  const pendingNavigationRef = useRef(false);

  const scannedCount = chunks.size;
  const progress = totalChunks ? (scannedCount / totalChunks) * 100 : 0;

  useEffect(() => {
    if (totalChunks && scannedCount === totalChunks && !isComplete) {
      handleImportComplete();
    }
  }, [scannedCount, totalChunks, isComplete]);

  const navigateHome = useCallback(() => {
    // Small delay to ensure cleanup is complete
    setTimeout(() => {
      router.replace('/');
    }, 100);
  }, [router]);

  const handleScannerStopped = useCallback(() => {
    if (pendingNavigationRef.current) {
      pendingNavigationRef.current = false;
      navigateHome();
    }
  }, [navigateHome]);

  const handleImportComplete = async () => {
    if (!totalChunks) {
      return;
    }

    setIsComplete(true);
    setScannerActive(false);

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
      // Clear all cached data
      queryClient.clear();
      await alertAsync(
        'Import Successful',
        `Imported:\n- ${result.portfoliosImported} portfolios\n- ${result.assetsImported} assets\n- ${result.transactionsImported} transactions`
      );

      // Navigate after alert is dismissed
      if (Platform.OS === 'web') {
        pendingNavigationRef.current = true;
        // If scanner already stopped, navigate immediately
        handleScannerStopped();
      } else {
        navigateHome();
      }
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
    setScannerActive(true);
    lastScannedRef.current = '';
    pendingNavigationRef.current = false;
  };

  const handleScan = (data: string) => {
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

  return (
    <Page title="Import via QR" fallbackPath="/settings">
      <YStack flex={1}>
        {/* Camera/Scanner View */}
        <YStack flex={1}>
          {Platform.OS === 'web' ? (
            <WebQRScanner
              onScan={handleScan}
              isActive={scannerActive}
              onStop={handleScannerStopped}
            />
          ) : (
            <NativeQRScanner onScan={handleScan} />
          )}
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
