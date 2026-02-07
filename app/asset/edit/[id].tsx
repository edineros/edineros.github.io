import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { YStack, Text, Spinner } from 'tamagui';
import { useAsset, useUpdateAsset, useDeleteAsset } from '../../../lib/hooks/useAssets';
import { useCategories } from '../../../lib/hooks/useCategories';
import { Page } from '../../../components/Page';
import { Form } from '../../../components/Form';
import { FormField } from '../../../components/FormField';
import { LongButton } from '../../../components/LongButton';
import { alert, confirm } from '../../../lib/utils/confirm';
import { isSimpleAssetType } from '../../../lib/constants/assetTypes';
import { useColors } from '../../../lib/theme/store';
import { HeaderIconButton } from '../../../components/HeaderButtons';

export default function EditAssetScreen() {
  const { id, portfolioId } = useLocalSearchParams<{ id: string; portfolioId: string }>();
  const colors = useColors();
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const { data: asset, isLoading } = useAsset(id);
  const { data: categories = [] } = useCategories();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();

  useEffect(() => {
    if (asset) {
      setName(asset.name || '');
      setCategoryId(asset.categoryId);
    }
  }, [asset]);

  const handleSave = async () => {
    try {
      await updateAsset.mutateAsync({
        id: id!,
        updates: { name: name.trim() || undefined, categoryId },
      });
      router.back();
    } catch (error) {
      alert('Error', (error as Error).message);
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
      try {
        await deleteAsset.mutateAsync({ id: id!, portfolioId });
        router.replace(`/portfolio/${portfolioId}`);
      } catch (error) {
        alert('Error', (error as Error).message);
      }
    }
  };

  const fallbackPath = portfolioId ? `/asset/${id}?portfolioId=${portfolioId}` : '/';

  if (isLoading) {
    return (
      <Page title="Edit Asset" fallbackPath={fallbackPath}>
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color={colors.text} />
        </YStack>
      </Page>
    );
  }

  if (!asset) {
    return (
      <Page title="Edit Asset" fallbackPath={fallbackPath}>
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
          <Text color={colors.text}>Asset not found</Text>
        </YStack>
      </Page>
    );
  }

  const isSimple = isSimpleAssetType(asset.type);

  return (
    <Page
      title="Edit Asset"
      fallbackPath={fallbackPath}
      rightComponent={
        <HeaderIconButton
          color={colors.destructive}
          icon="trash-outline"
          onPress={handleDelete}
        />
      }
    >
      <Form
        footer={
          <LongButton onPress={handleSave} disabled={updateAsset.isPending}>
            {updateAsset.isPending ? 'Saving...' : 'Save Changes'}
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

        {categories.length > 0 && (
          <FormField
            type="category"
            label="Category (Optional)"
            value={categoryId}
            onChangeCategory={setCategoryId}
            categories={categories}
            placeholder="Select category"
            helperText="Categories help organize and visualize your asset allocation"
          />
        )}
      </Form>
    </Page>
  );
}
