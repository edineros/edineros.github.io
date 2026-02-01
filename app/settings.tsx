import { useState, useRef } from 'react';
import { ScrollView, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { exportToJson, shareFile, importFromJson } from '../lib/utils/export';
import { alert, alertAsync, confirm } from '../lib/utils/confirm';
import { useAppStore } from '../store';
import { Page } from '../components/Page';
import { LongButton } from '../components/LongButton';
import { SettingsSection } from '../components/SettingsSection';
import { CONTENT_HORIZONTAL_PADDING } from '../lib/constants/layout';
import { useThemeStore, useColors, type ThemeMode } from '../lib/theme/store';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'auto', label: 'Auto', icon: 'phone-portrait-outline' },
];

export default function SettingsScreen() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { loadPortfolios } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mode, setMode } = useThemeStore();
  const colors = useColors();
  const router = useRouter();

  const handleExportJson = async () => {
    setIsExporting(true);
    try {
      const filePath = await exportToJson();
      await shareFile(filePath);
    } catch (error) {
      alert('Export Failed', (error as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const processImport = async (content: string) => {
    setIsImporting(true);
    try {
      const importResult = await importFromJson(content);

      await loadPortfolios();

      await alertAsync(
        'Import Successful',
        `Imported:\n- ${importResult.portfoliosImported} portfolios\n- ${importResult.assetsImported} assets\n- ${importResult.transactionsImported} transactions`
      );
      router.replace('/');
    } catch (error) {
      alert('Import Failed', (error as Error).message);
    } finally {
      setIsImporting(false);
    }
  };

  const confirmImport = async () => {
    return confirm({
      title: 'Replace All Data?',
      message: 'Importing will delete all existing portfolios, assets, and transactions. This action cannot be undone.',
      confirmText: 'Replace',
      cancelText: 'Cancel',
      destructive: true,
    });
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

      const confirmed = await confirmImport();
      if (!confirmed) {
        return;
      }

      const file = new File(pickedFile.uri);
      const content = await file.text();
      await processImport(content);
    } catch (error) {
      alert('Import Failed', (error as Error).message);
      setIsImporting(false);
    }
  };

  const handleImportWeb = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const confirmed = await confirmImport();
    if (!confirmed) {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      const content = await file.text();
      await processImport(content);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImport = Platform.OS === 'web' ? handleImportWeb : handleImportNative;

  return (
    <Page title="Settings" fallbackPath="/">
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
          <SettingsSection title="Appearance" subtitle="Choose your preferred theme">
            <XStack gap={8}>
              {THEME_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.7}
                  onPress={() => setMode(option.value)}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor: mode === option.value ? colors.accent : colors.backgroundTertiary,
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Ionicons
                    name={option.icon}
                    size={22}
                    color={mode === option.value ? '#FFFFFF' : colors.textSecondary}
                  />
                  <Text
                    color={mode === option.value ? '#FFFFFF' : colors.textSecondary}
                    fontSize={13}
                    fontWeight={mode === option.value ? '600' : '400'}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </XStack>
          </SettingsSection>

          <SettingsSection
            title="Data Export"
            subtitle="Export your portfolio data for backup or analysis"
          >
            <LongButton
              onPress={handleExportJson}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export as JSON (Full Backup)'}
            </LongButton>
          </SettingsSection>

          <SettingsSection
            title="Data Import"
            subtitle="Import data from a previous backup. This will replace all existing data."
          >
            <LongButton
              onPress={handleImport}
              disabled={isImporting}
            >
              {isImporting ? 'Importing...' : 'Import from JSON'}
            </LongButton>
          </SettingsSection>

          <SettingsSection title="About">
            <YStack gap={8}>
              <XStack justifyContent="space-between">
                <Text color={colors.textSecondary}>Version</Text>
                <Text color={colors.text}>1.0.0</Text>
              </XStack>

              <YStack height={1} backgroundColor={colors.border} marginVertical={8} />

              <Text color={colors.textSecondary} fontSize={15}>
                Portfolio Tracker is a privacy-first, offline-capable portfolio tracking
                application. Your data is stored locally on your device and is never sent
                to any server.
              </Text>

              <YStack height={1} backgroundColor={colors.border} marginVertical={8} />

              <Text color={colors.textTertiary} fontSize={13}>
                Price data provided by Yahoo Finance, Kraken, and Frankfurter API.
              </Text>
            </YStack>
          </SettingsSection>
        </YStack>
      </ScrollView>
    </Page>
  );
}
