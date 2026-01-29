import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { YStack, Text, Spinner, Separator } from 'tamagui';
import { useAppStore } from '../../../store';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Form } from '../../../components/Form';
import { FormField } from '../../../components/FormField';
import { LongButton } from '../../../components/LongButton';
import { alert, confirm } from '../../../lib/utils/confirm';
import { getPortfolioById } from '../../../lib/db/portfolios';
import type { Portfolio } from '../../../lib/types';

export default function EditPortfolioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { updatePortfolio, deletePortfolio } = useAppStore();

  useEffect(() => {
    if (id) {
      loadPortfolio();
    }
  }, [id]);

  const loadPortfolio = async () => {
    try {
      const p = await getPortfolioById(id!);
      if (p) {
        setPortfolio(p);
        setName(p.name);
        setCurrency(p.currency);
      }
    } catch (error) {
      alert('Error', (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Error', 'Please enter a portfolio name');
      return;
    }

    setIsSaving(true);
    try {
      await updatePortfolio(id!, { name: name.trim(), currency });
      router.back();
    } catch (error) {
      alert('Error', (error as Error).message);
    } finally {
      setIsSaving(false);
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
      setIsDeleting(true);
      try {
        await deletePortfolio(id!);
        router.replace('/');
      } catch (error) {
        alert('Error', (error as Error).message);
        setIsDeleting(false);
      }
    }
  };

  if (isLoading) {
    return (
      <YStack flex={1} backgroundColor="#000000">
        <ScreenHeader title="Edit Portfolio" showBack fallbackPath="/" />
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" />
        </YStack>
      </YStack>
    );
  }

  if (!portfolio) {
    return (
      <YStack flex={1} backgroundColor="#000000">
        <ScreenHeader title="Edit Portfolio" showBack fallbackPath="/" />
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
          <Text>Portfolio not found</Text>
        </YStack>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="#000000">
      <ScreenHeader title="Edit Portfolio" showBack fallbackPath={`/portfolio/${id}`} />
      <Form
        footer={
          <YStack gap={24}>
            <LongButton onPress={handleSave} disabled={isSaving || !name.trim()}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </LongButton>
            <Separator />
            <LongButton
              label="Danger Zone"
              onPress={handleDelete}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting ? 'Deleting...' : 'Delete Portfolio'}
            </LongButton>
          </YStack>
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
    </YStack>
  );
}
