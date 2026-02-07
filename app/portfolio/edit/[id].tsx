import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { YStack, Text, Spinner } from 'tamagui';
import { Page } from '../../../components/Page';
import { Form } from '../../../components/Form';
import { FormField } from '../../../components/FormField';
import { LongButton } from '../../../components/LongButton';
import { alert, confirm } from '../../../lib/utils/confirm';
import { usePortfolio, useUpdatePortfolio, useDeletePortfolio } from '../../../lib/hooks/usePortfolios';
import { useAppStore } from '../../../store';
import { useColors } from '../../../lib/theme/store';
import { HeaderIconButton } from '../../../components/HeaderButtons';

export default function EditPortfolioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const { clearLastPortfolioId } = useAppStore();

  const { data: portfolio, isLoading } = usePortfolio(id);
  const updatePortfolio = useUpdatePortfolio();
  const deletePortfolio = useDeletePortfolio();

  useEffect(() => {
    if (portfolio) {
      setName(portfolio.name);
      setCurrency(portfolio.currency);
    }
  }, [portfolio]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Error', 'Please enter a portfolio name');
      return;
    }

    try {
      await updatePortfolio.mutateAsync({ id: id!, updates: { name: name.trim(), currency } });
      router.back();
    } catch (error) {
      alert('Error', (error as Error).message);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Portfolio',
      message: `Are you sure you want to delete "${portfolio?.name}"? This will permanently delete all assets and transactions in this portfolio.`,
      confirmText: 'Delete',
      destructive: true,
    });

    if (confirmed) {
      try {
        await deletePortfolio.mutateAsync(id!);
        await clearLastPortfolioId(id!);
        router.replace('/');
      } catch (error) {
        alert('Error', (error as Error).message);
      }
    }
  };

  if (isLoading) {
    return (
      <Page title="Edit Portfolio" fallbackPath="/">
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color={colors.text} />
        </YStack>
      </Page>
    );
  }

  if (!portfolio) {
    return (
      <Page title="Edit Portfolio" fallbackPath="/">
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
          <Text color={colors.text}>Portfolio not found</Text>
        </YStack>
      </Page>
    );
  }

  return (
    <Page
      title="Edit Portfolio"
      fallbackPath={`/portfolio/${id}`}
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
          <LongButton onPress={handleSave} disabled={updatePortfolio.isPending || !name.trim()}>
            {updatePortfolio.isPending ? 'Saving...' : 'Save Changes'}
          </LongButton>
        }
      >
        <FormField
          label="Portfolio Name"
          value={name}
          onChangeText={setName}
          placeholder="My Portfolio"
        />
        <FormField
          type="currency"
          label="Base Currency"
          value={currency}
          onChangeText={setCurrency}
          helperText="Changing currency will affect how values are displayed"
        />
      </Form>
    </Page>
  );
}
