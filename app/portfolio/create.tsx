import { useState } from 'react';
import { ScrollView, Pressable, TextInput } from 'react-native';
import { alert } from '../../lib/utils/confirm';
import { router, Stack } from 'expo-router';
import { YStack, Text } from 'tamagui';
import { useAppStore } from '../../store';
import { CurrencySelect } from '../../components/CurrencySelect';

export default function CreatePortfolioScreen() {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [isCreating, setIsCreating] = useState(false);
  const { createPortfolio } = useAppStore();

  const handleCreate = async () => {
    if (!name.trim()) {
      alert('Error', 'Please enter a portfolio name');
      return;
    }

    setIsCreating(true);
    try {
      const portfolio = await createPortfolio(name.trim(), currency);
      router.replace(`/portfolio/${portfolio.id}`);
    } catch (error) {
      alert('Error', (error as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'New Portfolio' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: '#000000' }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <YStack flex={1} padding={16} backgroundColor="#000000">
          {/* Name input */}
        <YStack gap={8} marginBottom={24}>
          <Text color="#8E8E93" fontSize={13} fontWeight="600">
            NAME
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="My Portfolio"
            placeholderTextColor="#636366"
            autoFocus
            style={{
              backgroundColor: '#111111',
              borderRadius: 12,
              padding: 16,
              fontSize: 17,
              color: '#FFFFFF',
              borderWidth: 1,
              borderColor: '#1F1F1F',
            }}
          />
        </YStack>

        {/* Currency selection */}
        <YStack gap={8} marginBottom={32}>
          <CurrencySelect
            value={currency}
            onChange={setCurrency}
            label="BASE CURRENCY"
          />
          <Text color="#636366" fontSize={13}>
            All values will be displayed in this currency
          </Text>
        </YStack>

        {/* Create button */}
        <YStack flex={1} justifyContent="flex-end" paddingBottom={24}>
          <Pressable
            onPress={handleCreate}
            disabled={isCreating || !name.trim()}
          >
            <YStack
              backgroundColor="#007AFF"
              paddingVertical={16}
              borderRadius={12}
              alignItems="center"
              opacity={isCreating || !name.trim() ? 0.5 : 1}
              pressStyle={{ opacity: 0.8 }}
            >
              <Text color="#FFFFFF" fontSize={17} fontWeight="600">
                {isCreating ? 'Creating...' : 'Create Portfolio'}
              </Text>
            </YStack>
          </Pressable>
        </YStack>
      </YStack>
    </ScrollView>
    </>
  );
}
