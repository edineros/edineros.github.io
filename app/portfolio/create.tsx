import { useState } from 'react';
import { Alert, ScrollView, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import { YStack, XStack, Text } from 'tamagui';
import { useAppStore } from '../../store';
import { CURRENCY_OPTIONS } from '../../lib/utils/format';

export default function CreatePortfolioScreen() {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [isCreating, setIsCreating] = useState(false);
  const { createPortfolio } = useAppStore();

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a portfolio name');
      return;
    }

    setIsCreating(true);
    try {
      const portfolio = await createPortfolio(name.trim(), currency);
      router.replace(`/portfolio/${portfolio.id}`);
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#000000' }}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <YStack flex={1} padding={16} backgroundColor="#000000">
        <Text color="#FFFFFF" fontSize={34} fontWeight="700" marginBottom={32}>
          New Portfolio
        </Text>

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
          <Text color="#8E8E93" fontSize={13} fontWeight="600">
            BASE CURRENCY
          </Text>
          <Text color="#636366" fontSize={13} marginBottom={8}>
            All values will be displayed in this currency
          </Text>
          <XStack flexWrap="wrap" gap={8}>
            {CURRENCY_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setCurrency(option.value)}
              >
                <YStack
                  backgroundColor={currency === option.value ? '#007AFF' : '#111111'}
                  borderWidth={1}
                  borderColor={currency === option.value ? '#007AFF' : '#1F1F1F'}
                  paddingVertical={10}
                  paddingHorizontal={16}
                  borderRadius={8}
                  pressStyle={{ opacity: 0.8 }}
                >
                  <Text
                    color={currency === option.value ? '#FFFFFF' : '#8E8E93'}
                    fontSize={15}
                    fontWeight="600"
                  >
                    {option.value}
                  </Text>
                </YStack>
              </Pressable>
            ))}
          </XStack>
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
  );
}
