import { useState, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { YStack, Text, Button, Input, Label, Spinner, Separator } from 'tamagui';
import { useAppStore } from '../../../store';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { CurrencySelect } from '../../../components/CurrencySelect';
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
      <ScrollView style={{ flex: 1 }}>
      <YStack flex={1} padding="$4" gap="$4">
        <YStack gap="$2">
          <Label htmlFor="name">Portfolio Name</Label>
          <Input
            id="name"
            size="$4"
            placeholder="My Portfolio"
            value={name}
            onChangeText={setName}
          />
        </YStack>

        <YStack gap="$2">
          <CurrencySelect
            value={currency}
            onChange={setCurrency}
            label="BASE CURRENCY"
          />
          <Text fontSize="$3" color="$gray10">
            Changing currency will affect how values are displayed
          </Text>
        </YStack>

        <Button
          size="$5"
          backgroundColor="$blue10"
          color="white"
          fontWeight="600"
          onPress={handleSave}
          disabled={isSaving || !name.trim()}
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
            {isDeleting ? 'Deleting...' : 'Delete Portfolio'}
          </Button>
        </YStack>
      </YStack>
    </ScrollView>
    </YStack>
  );
}
