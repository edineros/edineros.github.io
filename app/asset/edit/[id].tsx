import { useState, useEffect, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { YStack, Text, Spinner, Separator } from 'tamagui';
import { useAppStore } from '../../../store';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Form } from '../../../components/Form';
import { FormField } from '../../../components/FormField';
import { LongButton } from '../../../components/LongButton';
import { alert, confirm } from '../../../lib/utils/confirm';
import { getAssetById, getAllAssetTags } from '../../../lib/db/assets';
import { TagInputRef } from '../../../components/TagInput';
import { isSimpleAssetType } from '../../../lib/constants/assetTypes';
import { useColors } from '../../../lib/theme/store';
import type { Asset } from '../../../lib/types';
import { HeaderIconButton } from '../../../components/HeaderButtons';

export default function EditAssetScreen() {
  const { id, portfolioId } = useLocalSearchParams<{ id: string; portfolioId: string }>();
  const colors = useColors();
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
      <YStack flex={1} backgroundColor={colors.background}>
        <ScreenHeader title="Edit Asset" showBack fallbackPath={fallbackPath} />
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color={colors.text} />
        </YStack>
      </YStack>
    );
  }

  if (!asset) {
    return (
      <YStack flex={1} backgroundColor={colors.background}>
        <ScreenHeader title="Edit Asset" showBack fallbackPath={fallbackPath} />
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
          <Text color={colors.text}>Asset not found</Text>
        </YStack>
      </YStack>
    );
  }

  const isSimple = isSimpleAssetType(asset.type);

  return (
    <YStack flex={1} backgroundColor={colors.background}>
      <ScreenHeader
        title="Edit Asset"
        showBack
        fallbackPath={fallbackPath}
        rightComponent={
          <HeaderIconButton
            color={colors.destructive}
            icon="trash-outline"
            onPress={handleDelete}
          />
        }
      />
      <Form
        footer={
          <LongButton onPress={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </LongButton>
        }
      >
        <FormField
          label={isSimple ? 'Name' : 'Display Name (Optional)'}
          value={name}
          onChangeText={setName}
          placeholder={isSimple ? 'e.g., My Savings Account' : 'e.g., Apple Inc.'}
          helperText="A friendly name to display for the asset"
        />

        <FormField
          type="tag"
          label="Tags (Optional)"
          tags={tags}
          onTagsChange={setTags}
          existingTags={existingTags}
          tagInputRef={tagInputRef}
          placeholder="Add tags..."
          helperText="Tags help organize and filter your assets"
        />
      </Form>
    </YStack>
  );
}
