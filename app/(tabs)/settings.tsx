import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { YStack, XStack, Text, Button, Card, Separator } from 'tamagui';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { exportToJson, exportTransactionsToCsv, shareFile, importFromJson } from '../../lib/utils/export';
import { useAppStore } from '../../store';

export default function SettingsScreen() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { loadPortfolios } = useAppStore();

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

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      if (!file) {
        return;
      }

      setIsImporting(true);

      const content = await FileSystem.readAsStringAsync(file.uri);
      const importResult = await importFromJson(content);

      Alert.alert(
        'Import Successful',
        `Imported:\n- ${importResult.portfoliosImported} portfolios\n- ${importResult.assetsImported} assets\n- ${importResult.transactionsImported} transactions`
      );

      // Reload portfolios
      await loadPortfolios();
    } catch (error) {
      Alert.alert('Import Failed', (error as Error).message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }}>
      <YStack flex={1} padding="$4" gap="$4">
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
              icon={isExporting ? undefined : undefined}
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
