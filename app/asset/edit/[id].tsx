import { useState, useEffect } from 'react';
import { Alert, ScrollView } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { YStack, Text, Button, Input, Label, Spinner, Separator } from 'tamagui';
import { useAppStore } from '../../../store';
import { confirm } from '../../../lib/utils/confirm';
import { getAssetById } from '../../../lib/db/assets';
import type { Asset } from '../../../lib/types';

export default function EditAssetScreen() {
  const { id, portfolioId } = useLocalSearchParams<{ id: string; portfolioId: string }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { updateAsset, deleteAsset } = useAppStore();

  useEffect(() => {
    if (id) {
      loadAsset();
    }
  }, [id]);

  const loadAsset = async () => {
    try {
      const a = await getAssetById(id!);
      if (a) {
        setAsset(a);
        setName(a.name || '');
      }
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateAsset(id!, { name: name.trim() || undefined });
      router.back();
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Asset',
      message: `Are you sure you want to delete "${asset?.symbol}"? This will permanently delete all transactions and lots for this asset.`,
      confirmText: 'Delete',
      destructive: true,
    });

    if (confirmed && portfolioId) {
      setIsDeleting(true);
      try {
        await deleteAsset(id!, portfolioId);
        router.replace(`/portfolio/${portfolioId}`);
      } catch (error) {
        Alert.alert('Error', (error as Error).message);
        setIsDeleting(false);
      }
    }
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Asset' }} />
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" />
        </YStack>
      </>
    );
  }

  if (!asset) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Asset' }} />
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
          <Text>Asset not found</Text>
        </YStack>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Asset' }} />
      <ScrollView style={{ flex: 1 }}>
        <YStack flex={1} padding="$4" gap="$4">
          <YStack gap="$2">
            <Label>Symbol</Label>
            <Input
              size="$4"
              value={asset.symbol}
              disabled
              backgroundColor="$gray3"
            />
            <Text fontSize="$2" color="$gray10">
              Symbol cannot be changed
            </Text>
          </YStack>

          <YStack gap="$2">
            <Label htmlFor="name">Display Name (Optional)</Label>
            <Input
              id="name"
              size="$4"
              placeholder="e.g., Apple Inc."
              value={name}
              onChangeText={setName}
            />
            <Text fontSize="$2" color="$gray10">
              A friendly name to display alongside the symbol
            </Text>
          </YStack>

          <Button
            size="$5"
            backgroundColor="$blue10"
            color="white"
            fontWeight="600"
            onPress={handleSave}
            disabled={isSaving}
            marginTop="$4"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>

          <Separator marginVertical="$6" />

          <YStack gap="$2">
            <Text fontSize="$3" color="$gray10">
              Danger Zone
            </Text>
            <Button
              size="$5"
              backgroundColor="$red10"
              color="white"
              fontWeight="600"
              onPress={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Asset'}
            </Button>
          </YStack>
        </YStack>
      </ScrollView>
    </>
  );
}
