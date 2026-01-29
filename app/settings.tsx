import { useState, useRef } from 'react';
import { Alert, ScrollView, Platform } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { exportToJson, exportTransactionsToCsv, shareFile, importFromJson } from '../lib/utils/export';
import { useAppStore } from '../store';
import { ScreenHeader } from '../components/ScreenHeader';
import { LongButton } from '../components/LongButton';
import { CONTENT_HORIZONTAL_PADDING } from '../lib/constants/layout';

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
    <YStack flex={1} backgroundColor="#000000">
      <ScreenHeader title="Settings" showBack fallbackPath="/" />
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
          <YStack
            backgroundColor="#111111"
            borderRadius={12}
            borderWidth={1}
            borderColor="#1F1F1F"
            padding={CONTENT_HORIZONTAL_PADDING}
          >
            <Text color="#FFFFFF" fontSize={20} fontWeight="600" marginBottom={12}>
              Data Export
            </Text>
            <Text color="#8E8E93" fontSize={15} marginBottom={16}>
              Export your portfolio data for backup or analysis
            </Text>

            <YStack gap={12}>
              <LongButton
                onPress={handleExportJson}
                disabled={isExporting}
              >
                {isExporting ? 'Exporting...' : 'Export as JSON (Full Backup)'}
              </LongButton>

              <LongButton
                onPress={handleExportCsv}
                disabled={isExporting}
                variant="secondary"
              >
                {isExporting ? 'Exporting...' : 'Export Transactions as CSV'}
              </LongButton>
            </YStack>
          </YStack>

          <YStack
            backgroundColor="#111111"
            borderRadius={12}
            borderWidth={1}
            borderColor="#1F1F1F"
            padding={CONTENT_HORIZONTAL_PADDING}
          >
            <Text color="#FFFFFF" fontSize={20} fontWeight="600" marginBottom={12}>
              Data Import
            </Text>
            <Text color="#8E8E93" fontSize={15} marginBottom={16}>
              Import data from a previous backup. This will create new entries without
              affecting existing data.
            </Text>

            <LongButton
              onPress={handleImport}
              disabled={isImporting}
            >
              {isImporting ? 'Importing...' : 'Import from JSON'}
            </LongButton>
          </YStack>

          <YStack
            backgroundColor="#111111"
            borderRadius={12}
            borderWidth={1}
            borderColor="#1F1F1F"
            padding={CONTENT_HORIZONTAL_PADDING}
          >
            <Text color="#FFFFFF" fontSize={20} fontWeight="600" marginBottom={12}>
              About
            </Text>

            <YStack gap={8}>
              <XStack justifyContent="space-between">
                <Text color="#8E8E93">Version</Text>
                <Text color="#FFFFFF">1.0.0</Text>
              </XStack>

              <YStack height={1} backgroundColor="#1F1F1F" marginVertical={8} />

              <Text color="#8E8E93" fontSize={15}>
                Portfolio Tracker is a privacy-first, offline-capable portfolio tracking
                application. Your data is stored locally on your device and is never sent
                to any server.
              </Text>

              <YStack height={1} backgroundColor="#1F1F1F" marginVertical={8} />

              <Text color="#636366" fontSize={13}>
                Price data provided by Yahoo Finance, Kraken, and Frankfurter API.
              </Text>
            </YStack>
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
