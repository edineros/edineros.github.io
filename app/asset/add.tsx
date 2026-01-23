import { useState, useEffect } from 'react';
import { Alert, ScrollView, Pressable, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { useAppStore } from '../../store';
import { searchSymbol } from '../../lib/api/prices';
import { getPortfolioById } from '../../lib/db/portfolios';
import { CURRENCY_OPTIONS } from '../../lib/utils/format';
import type { AssetType } from '../../lib/types';

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: 'stock', label: 'Stock' },
  { value: 'etf', label: 'ETF' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'bond', label: 'Bond' },
  { value: 'commodity', label: 'Commodity' },
  { value: 'forex', label: 'Forex' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

export default function AddAssetScreen() {
  const { portfolioId } = useLocalSearchParams<{ portfolioId: string }>();
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>('stock');
  const [currency, setCurrency] = useState('EUR');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { createAsset } = useAppStore();

  useEffect(() => {
    if (portfolioId) {
      getPortfolioById(portfolioId).then((p) => {
        if (p) {
          setCurrency(p.currency);
        }
      });
    }
  }, [portfolioId]);

  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (symbol.length >= 1) {
        setIsSearching(true);
        try {
          const results = await searchSymbol(symbol, type);
          setSearchResults(results);
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [symbol, type]);

  const handleSelectResult = (result: any) => {
    setSymbol(result.symbol);
    setName(result.name);
    setSearchResults([]);
  };

  const handleCreate = async () => {
    if (!symbol.trim()) {
      Alert.alert('Error', 'Please enter a symbol');
      return;
    }

    if (!portfolioId) {
      Alert.alert('Error', 'Portfolio not found');
      return;
    }

    setIsCreating(true);
    try {
      const asset = await createAsset(
        portfolioId,
        symbol.trim().toUpperCase(),
        type,
        name.trim() || undefined,
        currency
      );
      router.replace(`/asset/${asset.id}?portfolioId=${portfolioId}`);
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
          Add Asset
        </Text>

        {/* Asset type */}
        <YStack gap={8} marginBottom={24}>
          <Text color="#8E8E93" fontSize={13} fontWeight="600">
            TYPE
          </Text>
          <XStack flexWrap="wrap" gap={8}>
            {ASSET_TYPES.map((item) => (
              <Pressable key={item.value} onPress={() => setType(item.value)}>
                <YStack
                  backgroundColor={type === item.value ? '#007AFF' : '#111111'}
                  borderWidth={1}
                  borderColor={type === item.value ? '#007AFF' : '#1F1F1F'}
                  paddingVertical={8}
                  paddingHorizontal={12}
                  borderRadius={8}
                  pressStyle={{ opacity: 0.8 }}
                >
                  <Text
                    color={type === item.value ? '#FFFFFF' : '#8E8E93'}
                    fontSize={14}
                    fontWeight="600"
                  >
                    {item.label}
                  </Text>
                </YStack>
              </Pressable>
            ))}
          </XStack>
        </YStack>

        {/* Symbol input */}
        <YStack gap={8} marginBottom={24}>
          <Text color="#8E8E93" fontSize={13} fontWeight="600">
            SYMBOL
          </Text>
          <TextInput
            value={symbol}
            onChangeText={setSymbol}
            placeholder={type === 'crypto' ? 'BTC, ETH...' : 'AAPL, MSFT...'}
            placeholderTextColor="#636366"
            autoCapitalize="characters"
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
          {isSearching && (
            <XStack padding={8} alignItems="center" gap={8}>
              <Spinner size="small" color="#8E8E93" />
              <Text color="#8E8E93" fontSize={13}>Searching...</Text>
            </XStack>
          )}
          {searchResults.length > 0 && (
            <YStack
              backgroundColor="#111111"
              borderRadius={12}
              borderWidth={1}
              borderColor="#1F1F1F"
              overflow="hidden"
              maxHeight={200}
            >
              <ScrollView>
                {searchResults.map((result, index) => (
                  <Pressable
                    key={`${result.symbol}-${index}`}
                    onPress={() => handleSelectResult(result)}
                  >
                    <YStack
                      padding={12}
                      borderBottomWidth={index < searchResults.length - 1 ? 1 : 0}
                      borderBottomColor="#1F1F1F"
                      pressStyle={{ backgroundColor: '#1A1A1A' }}
                    >
                      <XStack justifyContent="space-between" alignItems="center">
                        <Text color="#FFFFFF" fontWeight="600">{result.symbol}</Text>
                        <Text
                          fontSize={11}
                          fontWeight="600"
                          color="#8E8E93"
                          backgroundColor="#1F1F1F"
                          paddingHorizontal={6}
                          paddingVertical={2}
                          borderRadius={4}
                          textTransform="uppercase"
                        >
                          {result.type}
                        </Text>
                      </XStack>
                      <Text color="#636366" fontSize={13} numberOfLines={1}>
                        {result.name}
                      </Text>
                    </YStack>
                  </Pressable>
                ))}
              </ScrollView>
            </YStack>
          )}
        </YStack>

        {/* Name input */}
        <YStack gap={8} marginBottom={24}>
          <Text color="#8E8E93" fontSize={13} fontWeight="600">
            NAME (OPTIONAL)
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Apple Inc."
            placeholderTextColor="#636366"
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
            CURRENCY
          </Text>
          <Text color="#636366" fontSize={13} marginBottom={8}>
            Currency the asset is priced in
          </Text>
          <XStack flexWrap="wrap" gap={8}>
            {CURRENCY_OPTIONS.slice(0, 6).map((option) => (
              <Pressable key={option.value} onPress={() => setCurrency(option.value)}>
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
            disabled={isCreating || !symbol.trim()}
          >
            <YStack
              backgroundColor="#007AFF"
              paddingVertical={16}
              borderRadius={12}
              alignItems="center"
              opacity={isCreating || !symbol.trim() ? 0.5 : 1}
              pressStyle={{ opacity: 0.8 }}
            >
              <Text color="#FFFFFF" fontSize={17} fontWeight="600">
                {isCreating ? 'Adding...' : 'Add Asset'}
              </Text>
            </YStack>
          </Pressable>
        </YStack>
      </YStack>
    </ScrollView>
  );
}
