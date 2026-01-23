import { useState, useEffect } from 'react';
import { Alert, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { YStack, XStack, Text, Button, Input, Label, Spinner } from 'tamagui';
import { useAppStore } from '../../../store';
import { getPortfolioById } from '../../../lib/db/portfolios';
import { CURRENCY_OPTIONS } from '../../../lib/utils/format';
import type { Portfolio } from '../../../lib/types';

export default function EditPortfolioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { updatePortfolio } = useAppStore();

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
      Alert.alert('Error', (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a portfolio name');
      return;
    }

    setIsSaving(true);
    try {
      await updatePortfolio(id!, { name: name.trim(), currency });
      router.back();
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" />
      </YStack>
    );
  }

  if (!portfolio) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text>Portfolio not found</Text>
      </YStack>
    );
  }

  return (
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
          <Label>Base Currency</Label>
          <Text fontSize="$3" color="$gray10" marginBottom="$2">
            Changing currency will affect how values are displayed
          </Text>
          <XStack flexWrap="wrap" gap="$2">
            {CURRENCY_OPTIONS.map((option) => (
              <Button
                key={option.value}
                size="$3"
                variant={currency === option.value ? undefined : 'outlined'}
                backgroundColor={currency === option.value ? '$blue10' : undefined}
                color={currency === option.value ? 'white' : undefined}
                onPress={() => setCurrency(option.value)}
              >
                {option.value}
              </Button>
            ))}
          </XStack>
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
      </YStack>
    </ScrollView>
  );
}
