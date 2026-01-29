import { useState, useEffect, useRef } from 'react';
import { ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { alert } from '../../lib/utils/confirm';
import { router, useLocalSearchParams } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { useAppStore } from '../../store';
import { ScreenHeader } from '../../components/ScreenHeader';
import { LongButton } from '../../components/LongButton';
import { CurrencySelect } from '../../components/CurrencySelect';
import { TagInput, TagInputRef } from '../../components/TagInput';
import { searchSymbol } from '../../lib/api/prices';
import { getPortfolioById } from '../../lib/db/portfolios';
import { getAllAssetTags } from '../../lib/db/assets';
import { getAssetTypeLabel } from '../../lib/constants/assetTypes';
import type { AssetType } from '../../lib/types';

export default function AddAssetScreen() {
  const { portfolioId, type: typeParam } = useLocalSearchParams<{ portfolioId: string; type: string }>();
  const type = (typeParam as AssetType) || 'stock';
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [tags, setTags] = useState<string[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const tagInputRef = useRef<TagInputRef>(null);
  const { createAsset } = useAppStore();

  useEffect(() => {
    if (portfolioId) {
      getPortfolioById(portfolioId).then((p) => {
        if (p) {
          setCurrency(p.currency);
        }
      });
    }
    // Load existing tags for autocomplete
    getAllAssetTags().then(setExistingTags);
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
      alert('Error', 'Please enter a symbol');
      return;
    }

    if (!portfolioId) {
      alert('Error', 'Portfolio not found');
      return;
    }

    setIsCreating(true);
    try {
      // Commit any pending tag in the input field so that it's not lost if we forgot to explicity save it
      const finalTags = tagInputRef.current?.commitPending() ?? tags;

      const asset = await createAsset(
        portfolioId,
        symbol.trim().toUpperCase(),
        type,
        name.trim() || undefined,
        currency,
        finalTags
      );
      router.replace(`/asset/${asset.id}?portfolioId=${portfolioId}`);
    } catch (error) {
      alert('Error', (error as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  const headerTitle = `Add ${getAssetTypeLabel(type)}`;

  return (
    <YStack flex={1} backgroundColor="#000000">
      <ScreenHeader title={headerTitle} showBack fallbackPath={portfolioId ? `/portfolio/${portfolioId}` : '/'} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <YStack flex={1} padding={16}>
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
                <ScrollView keyboardShouldPersistTaps="handled">
                  {searchResults.map((result, index) => (
                    <TouchableOpacity
                      key={`${result.symbol}-${index}`}
                      activeOpacity={0.7}
                      onPress={() => handleSelectResult(result)}
                      style={{
                        padding: 12,
                        borderBottomWidth: index < searchResults.length - 1 ? 1 : 0,
                        borderBottomColor: '#1F1F1F',
                      }}
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
                    </TouchableOpacity>
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
          <YStack gap={8} marginBottom={24}>
            <CurrencySelect
              value={currency}
              onChange={setCurrency}
              label="CURRENCY"
            />
            <Text color="#636366" fontSize={13}>
              Currency the asset is priced in
            </Text>
          </YStack>

          {/* Tags */}
          <YStack gap={8} marginBottom={32}>
            <Text color="#8E8E93" fontSize={13} fontWeight="600">
              TAGS (OPTIONAL)
            </Text>
            <TagInput
              ref={tagInputRef}
              tags={tags}
              onChange={setTags}
              existingTags={existingTags}
              placeholder="Add tags..."
            />
            <Text color="#636366" fontSize={13}>
              Tags help organize and filter your assets
            </Text>
          </YStack>

          {/* Create button */}
          <YStack flex={1} justifyContent="flex-end" paddingBottom={24}>
            <LongButton
              onPress={handleCreate}
              disabled={isCreating || !symbol.trim()}
            >
              {isCreating ? 'Adding...' : 'Add Asset'}
            </LongButton>
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
