import { useState, useEffect, useRef } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { alert } from '../../lib/utils/confirm';
import { router, useLocalSearchParams } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { usePortfolio } from '../../lib/hooks/usePortfolios';
import { useCreateAsset } from '../../lib/hooks/useAssets';
import { useCategories } from '../../lib/hooks/useCategories';
import { Page } from '../../components/Page';
import { Form } from '../../components/Form';
import { FormField } from '../../components/FormField';
import { LongButton } from '../../components/LongButton';
import { TagInputRef } from '../../components/TagInput';
import { searchSymbol } from '../../lib/api/prices';
import { getAllAssetTags } from '../../lib/db/assets';
import { getAssetTypeLabel, isSimpleAssetType } from '../../lib/constants/assetTypes';
import { useColors } from '../../lib/theme/store';
import type { AssetType } from '../../lib/types';

export default function AddAssetScreen() {
  const { portfolioId, type: typeParam } = useLocalSearchParams<{ portfolioId: string; type: string }>();
  const type = (typeParam as AssetType) || 'stock';
  const isSimple = isSimpleAssetType(type);
  const isBitcoin = type === 'bitcoin';
  const colors = useColors();
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [tags, setTags] = useState<string[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const tagInputRef = useRef<TagInputRef>(null);

  const { data: portfolio } = usePortfolio(portfolioId);
  const { data: categories = [] } = useCategories();
  const createAsset = useCreateAsset();

  useEffect(() => {
    if (portfolio) {
      setCurrency(portfolio.currency);
    }
  }, [portfolio]);

  useEffect(() => {
    // Load existing tags for autocomplete
    getAllAssetTags().then(setExistingTags);
  }, []);

  useEffect(() => {
    // Skip symbol search for simple asset types and bitcoin
    if (isSimple || isBitcoin) {
      return;
    }

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
  }, [symbol, type, isSimple, isBitcoin]);

  const handleSelectResult = (result: any) => {
    setSymbol(result.symbol);
    setName(result.name);
    setSearchResults([]);
  };

  const handleCreate = async () => {
    if (isSimple) {
      if (!name.trim()) {
        alert('Error', 'Please enter a name');
        return;
      }
    } else if (!isBitcoin) {
      if (!symbol.trim()) {
        alert('Error', 'Please enter a symbol');
        return;
      }
    }

    if (!portfolioId) {
      alert('Error', 'Portfolio not found');
      return;
    }

    try {
      // Commit any pending tag in the input field so that it's not lost if we forgot to explicity save it
      const finalTags = tagInputRef.current?.commitPending() ?? tags;

      // For simple assets, use the currency as the symbol (price is always 1 in that currency)
      // For bitcoin, always use 'BTC' as the symbol
      let assetSymbol: string;
      if (isBitcoin) {
        assetSymbol = 'BTC';
      } else if (isSimple) {
        assetSymbol = currency.toUpperCase();
      } else {
        assetSymbol = symbol.trim().toUpperCase();
      }

      const asset = await createAsset.mutateAsync({
        portfolioId,
        symbol: assetSymbol,
        type,
        name: name.trim() || undefined,
        currency,
        tags: finalTags,
        categoryId,
      });
      router.replace(`/asset/${asset.id}?portfolioId=${portfolioId}`);
    } catch (error) {
      alert('Error', (error as Error).message);
    }
  };

  const headerTitle = `Add ${getAssetTypeLabel(type)}`;
  // Bitcoin and simple types don't require symbol, but simple types require name
  const canCreate = isBitcoin ? true : (isSimple ? name.trim() : symbol.trim());

  return (
    <Page title={headerTitle} fallbackPath={portfolioId ? `/portfolio/${portfolioId}` : '/'}>
      <Form
        footer={
          <LongButton onPress={handleCreate} disabled={createAsset.isPending || !canCreate}>
            {createAsset.isPending ? 'Adding...' : 'Add Asset'}
          </LongButton>
        }
      >
        {/* Symbol input - only for non-simple, non-bitcoin assets */}
        {!isSimple && !isBitcoin && (
          <FormField
            label="Symbol"
            value={symbol}
            onChangeText={setSymbol}
            placeholder={type === 'crypto' ? 'BTC, ETH...' : 'AAPL, MSFT...'}
            autoCapitalize="characters"
            autoFocus
          >
            {isSearching && (
              <XStack padding={8} alignItems="center" gap={8}>
                <Spinner size="small" color={colors.textSecondary} />
                <Text color={colors.textSecondary} fontSize={13}>Searching...</Text>
              </XStack>
            )}
            {searchResults.length > 0 && (
              <YStack
                backgroundColor={colors.card}
                borderRadius={12}
                borderWidth={1}
                borderColor={colors.cardBorder}
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
                        borderBottomColor: colors.cardBorder,
                      }}
                    >
                      <XStack justifyContent="space-between" alignItems="center">
                        <Text color={colors.text} fontWeight="600">{result.symbol}</Text>
                        <Text
                          fontSize={11}
                          fontWeight="600"
                          color={colors.textSecondary}
                          backgroundColor={colors.border}
                          paddingHorizontal={6}
                          paddingVertical={2}
                          borderRadius={4}
                          textTransform="uppercase"
                        >
                          {result.type}
                        </Text>
                      </XStack>
                      <Text color={colors.textTertiary} fontSize={13} numberOfLines={1}>
                        {result.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </YStack>
            )}
          </FormField>
        )}

        <FormField
          label={isSimple ? 'Name' : 'Name (Optional)'}
          value={name}
          onChangeText={setName}
          placeholder={isBitcoin ? 'Bitcoin Stack' : (isSimple ? 'My savings account...' : 'Apple Inc.')}
          autoFocus={isSimple || isBitcoin}
        />

        <FormField
          type="currency"
          label="Currency"
          value={currency}
          onChangeText={setCurrency}
          helperText="Currency the asset is priced in"
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
    </Page>
  );
}
