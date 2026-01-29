import { useState, useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { YStack, Text, Input, Label, Spinner, Separator } from 'tamagui';
import { useAppStore } from '../../../store';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { LongButton } from '../../../components/LongButton';
import { alert, confirm } from '../../../lib/utils/confirm';
import { getAssetById, getAllAssetTags } from '../../../lib/db/assets';
import { TagInput, TagInputRef } from '../../../components/TagInput';
import type { Asset } from '../../../lib/types';

export default function EditAssetScreen() {
  const { id, portfolioId } = useLocalSearchParams<{ id: string; portfolioId: string }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [name, setName] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const tagInputRef = useRef<TagInputRef>(null);
  const { updateAsset, deleteAsset } = useAppStore();

  useEffect(() => {
    if (id) {
      loadAsset();
    }
  }, [id]);

  const loadAsset = async () => {
    try {
      const [a, allTags] = await Promise.all([
        getAssetById(id!),
        getAllAssetTags(),
      ]);
      if (a) {
        setAsset(a);
        setName(a.name || '');
        setTags(a.tags || []);
      }
      setExistingTags(allTags);
    } catch (error) {
      alert('Error', (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Commit any pending tag in the input field so that it's not lost if we forgot to explicity save it
      const finalTags = tagInputRef.current?.commitPending() ?? tags;

      await updateAsset(id!, { name: name.trim() || undefined, tags: finalTags });
      router.back();
    } catch (error) {
      alert('Error', (error as Error).message);
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
        alert('Error', (error as Error).message);
        setIsDeleting(false);
      }
    }
  };

  const fallbackPath = portfolioId ? `/asset/${id}?portfolioId=${portfolioId}` : '/';

  if (isLoading) {
    return (
      <YStack flex={1} backgroundColor="#000000">
        <ScreenHeader title="Edit Asset" showBack fallbackPath={fallbackPath} />
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" />
        </YStack>
      </YStack>
    );
  }

  if (!asset) {
    return (
      <YStack flex={1} backgroundColor="#000000">
        <ScreenHeader title="Edit Asset" showBack fallbackPath={fallbackPath} />
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
          <Text>Asset not found</Text>
        </YStack>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="#000000">
      <ScreenHeader title="Edit Asset" showBack fallbackPath={fallbackPath} />
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

          <YStack gap="$2">
            <Label>Tags (Optional)</Label>
            <TagInput
              ref={tagInputRef}
              tags={tags}
              onChange={setTags}
              existingTags={existingTags}
              placeholder="Add tags..."
            />
            <Text fontSize="$2" color="$gray10">
              Tags help organize and filter your assets
            </Text>
          </YStack>

          <LongButton
            onPress={handleSave}
            disabled={isSaving}
            topSpacing="small"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </LongButton>

          <Separator marginVertical="$6" />

          <YStack gap="$2">
            <Text fontSize="$3" color="$gray10">
              Danger Zone
            </Text>
            <LongButton
              onPress={handleDelete}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting ? 'Deleting...' : 'Delete Asset'}
            </LongButton>
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
