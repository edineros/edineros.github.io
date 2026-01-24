import { useState, useRef } from 'react';
import { Alert, ScrollView, Platform } from 'react-native';
import { YStack, XStack, Text, Button, Card, Separator } from 'tamagui';
import { exportToJson, exportTransactionsToCsv, shareFile, importFromJson } from '../../lib/utils/export';
import { useAppStore } from '../../store';
import { CONTENT_HORIZONTAL_PADDING } from '../../lib/constants/layout';

export default function SettingsScreen() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { loadPortfolios } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJson = async () => {
    setIsExporting(true);
    try {
      const filePath = await exportToJson();
      await shareFile(filePath);
    } catch (error) {
      Alert.alert('Export Failed', (error as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const filePath = await exportTransactionsToCsv();
      await shareFile(filePath);
    } catch (error) {
      Alert.alert('Export Failed', (error as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportNative = async () => {
    try {
      const DocumentPicker = await import('expo-document-picker');
      const { File } = await import('expo-file-system');

      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const pickedFile = result.assets[0];
      if (!pickedFile) {
        return;
      }

      setIsImporting(true);

      const file = new File(pickedFile.uri);
      const content = await file.text();
      const importResult = await importFromJson(content);

      Alert.alert(
        'Import Successful',
        `Imported:\n- ${importResult.portfoliosImported} portfolios\n- ${importResult.assetsImported} assets\n- ${importResult.transactionsImported} transactions`
      );

      await loadPortfolios();
    } catch (error) {
      Alert.alert('Import Failed', (error as Error).message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportWeb = () => {
    // Trigger hidden file input
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsImporting(true);
    try {
      const content = await file.text();
      const importResult = await importFromJson(content);

      Alert.alert(
        'Import Successful',
        `Imported:\n- ${importResult.portfoliosImported} portfolios\n- ${importResult.assetsImported} assets\n- ${importResult.transactionsImported} transactions`
      );

      await loadPortfolios();
    } catch (error) {
      Alert.alert('Import Failed', (error as Error).message);
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImport = Platform.OS === 'web' ? handleImportWeb : handleImportNative;

  return (
    <ScrollView style={{ flex: 1 }}>
      {/* Hidden file input for web */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      )}

      <YStack flex={1} padding={CONTENT_HORIZONTAL_PADDING} gap={16}>
        <Card elevate bordered padding="$4">
          <Text fontSize="$5" fontWeight="600" marginBottom="$3">
            Data Export
          </Text>
          <Text fontSize="$3" color="$gray10" marginBottom="$4">
            Export your portfolio data for backup or analysis
          </Text>

          <YStack gap="$3">
            <Button
              size="$4"
              onPress={handleExportJson}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export as JSON (Full Backup)'}
            </Button>

            <Button
              size="$4"
              variant="outlined"
              onPress={handleExportCsv}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export Transactions as CSV'}
            </Button>
          </YStack>
        </Card>

        <Card elevate bordered padding="$4">
          <Text fontSize="$5" fontWeight="600" marginBottom="$3">
            Data Import
          </Text>
          <Text fontSize="$3" color="$gray10" marginBottom="$4">
            Import data from a previous backup. This will create new entries without
            affecting existing data.
          </Text>

          <Button
            size="$4"
            onPress={handleImport}
            disabled={isImporting}
            theme="blue"
          >
            {isImporting ? 'Importing...' : 'Import from JSON'}
          </Button>
        </Card>

        <Card elevate bordered padding="$4">
          <Text fontSize="$5" fontWeight="600" marginBottom="$3">
            About
          </Text>

          <YStack gap="$2">
            <XStack justifyContent="space-between">
              <Text color="$gray10">Version</Text>
              <Text>1.0.0</Text>
            </XStack>

            <Separator marginVertical="$2" />

            <Text fontSize="$3" color="$gray10">
              Portfolio Tracker is a privacy-first, offline-capable portfolio tracking
              application. Your data is stored locally on your device and is never sent
              to any server.
            </Text>

            <Separator marginVertical="$2" />

            <Text fontSize="$2" color="$gray9">
              Price data provided by Yahoo Finance, CoinGecko, and Frankfurter API.
            </Text>
          </YStack>
        </Card>
      </YStack>
    </ScrollView>
  );
}
