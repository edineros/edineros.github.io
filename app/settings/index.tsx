import { useState, useRef } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from '../../lib/routing';
import { YStack, XStack, Text } from 'tamagui';
import Sun from 'lucide-react/dist/esm/icons/sun';
import Moon from 'lucide-react/dist/esm/icons/moon';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import QrCode from 'lucide-react/dist/esm/icons/qr-code';
import Code from 'lucide-react/dist/esm/icons/code';
import type { LucideIcon } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import packageJson from '../../package.json';
import { exportToJson, importFromJson } from '../../lib/utils/export';
import { alert, confirm } from '../../lib/utils/confirm';
import { Page } from '../../components/Page';
import { LongButton } from '../../components/LongButton';
import { SettingsSection } from '../../components/SettingsSection';
import { CategoriesSettings } from '../../components/CategoriesSettings';
import { CONTENT_HORIZONTAL_PADDING } from '../../lib/constants/layout';
import { useThemeStore, useColors, type ThemeMode } from '../../lib/theme/store';
import { alertImportSuccess } from '../../lib/utils/backup';

const CACHE_KEY = 'portfolio-query-cache';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'auto', label: 'Auto', icon: Smartphone },
];

export default function SettingsScreen() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mode, setMode } = useThemeStore();
  const colors = useColors();
  const router = useRouter();

  const handleExportJson = async () => {
    setIsExporting(true);
    try {
      await exportToJson();
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

      // Clear all cached data (in-memory)
      queryClient.clear();
      // Also clear persisted cache from storage to prevent stale data restoration
      window.localStorage.removeItem(CACHE_KEY);

      await alertImportSuccess(importResult);
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

  return (
    <Page title="Settings" fallbackPath="/">
      <ScrollView style={{ flex: 1 }}>
        {/* Hidden file input used to trigger the native file picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

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
                  <option.icon
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

          <CategoriesSettings />

          <SettingsSection
            title="Data Export"
            subtitle="Export your portfolio data for backup or transfer"
          >
            <YStack gap={12}>
              <LongButton
                icon={QrCode}
                onPress={() => router.push('/settings/qr-export')}
                variant="secondary"
              >
                Export via QR Code
              </LongButton>
              <LongButton
                icon={Code}
                onPress={handleExportJson}
                disabled={isExporting}
                variant="secondary"
              >
                {isExporting ? 'Exporting...' : 'Export as JSON'}
              </LongButton>
            </YStack>
          </SettingsSection>

          <SettingsSection
            title="Data Import"
            subtitle="Import data from a previous backup. This will replace all existing data."
          >
            <YStack gap={12}>
              <LongButton
                icon={QrCode}
                onPress={() => router.push('/settings/qr-import')}
                variant="secondary"
              >
                Import via QR Code
              </LongButton>
              <LongButton
                icon={Code}
                onPress={handleImportWeb}
                disabled={isImporting}
                variant="secondary"
              >
                {isImporting ? 'Importing...' : 'Import from JSON'}
              </LongButton>
            </YStack>
          </SettingsSection>

          <SettingsSection title="About">
            <YStack gap={8}>
              <XStack justifyContent="space-between">
                <Text color={colors.textSecondary}>Version</Text>
                <Text color={colors.text}>{packageJson.version}</Text>
              </XStack>

              <YStack height={1} backgroundColor={colors.border} marginVertical={8} />

              <Text color={colors.textSecondary} fontSize={15}>
                Edineros is a privacy-first, offline-capable portfolio tracking
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
