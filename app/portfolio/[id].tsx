import { useCallback, useState, useMemo, useEffect } from 'react';
import { FlatList, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { ALL_PORTFOLIOS_ID, useAppStore } from '../../store';
import { usePortfolios, usePortfolio, useUpdatePortfolio } from '../../lib/hooks/usePortfolios';
import { useAssets } from '../../lib/hooks/useAssets';
import { usePortfolioStats } from '../../lib/hooks/stats/usePortfolioStats';
import { queryKeys } from '../../lib/hooks/config/queryKeys';
import { Page } from '../../components/Page';
import { HeaderIconButton } from '../../components/HeaderButtons';
import { QuantityAtPrice } from '../../components/QuantityAtPrice';
import { AnimatedEllipsis } from '../../components/AnimatedEllipsis';
import { AddAssetMenu } from '../../components/AddAssetMenu';
import { SegmentedControl } from '../../components/SegmentedControl';
import { PortfolioSwitcher } from '../../components/PortfolioSwitcher';
import { AssetsTable } from '../../components/AssetsTable';
import { TableColumnConfigDialog } from '../../components/TableColumnConfigDialog';
import {
  AssetAllocationChart,
  calculateAllocations,
  calculateCategoryAllocations,
  AllocationMode,
} from '../../components/AssetAllocationChart';
import { useCategories } from '../../lib/hooks/useCategories';
import { formatCurrency, formatPercent, formatQuantity, getGainColor } from '../../lib/utils/format';
import { CONTENT_HORIZONTAL_PADDING } from '../../lib/constants/layout';
import { VALUE_MASK } from '../../lib/constants/ui';
import { isSimpleAssetType, getAssetTypeSortOrder } from '../../lib/constants/assetTypes';
import { useColors } from '../../lib/theme/store';
import type { Asset } from '../../lib/types';

export default function PortfolioDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('type');
  const [showTableConfig, setShowTableConfig] = useState(false);
  const colors = useColors();
  const { setCurrentPortfolio, loadTableConfig, tableConfig } = useAppStore();
  const updatePortfolioMutation = useUpdatePortfolio();
  const isCompactView = tableConfig.compact;

  // Load table config on mount
  useEffect(() => {
    loadTableConfig();
  }, [loadTableConfig]);

  // undefined for "all portfolios", otherwise the specific portfolio ID
  const portfolioId = id === ALL_PORTFOLIOS_ID ? undefined : id;

  // Load portfolios for switcher
  const { data: portfolios = [] } = usePortfolios();

  // Load categories
  const { data: categories = [] } = useCategories();

  // Load portfolio (for single portfolio view)
  const { data: portfolio } = usePortfolio(portfolioId);

  // Load assets (undefined = all assets, portfolioId = specific portfolio's assets)
  const { data: rawAssets = [] } = useAssets(portfolioId);

  // For "All Portfolios", use the first portfolio's currency as display currency
  const displayCurrency = portfolioId
    ? (portfolio?.currency ?? 'EUR')
    : (portfolios[0]?.currency ?? 'EUR');

  // Load stats (undefined = all portfolios, portfolioId = single portfolio)
  const { portfolio: stats, assetStats, isLoading, pendingPriceCount } = usePortfolioStats(portfolioId, displayCurrency);

  // Sort assets by type (using defined order), then by symbol/name within each type
  const portfolioAssets = useMemo(() => {
    return [...rawAssets].sort((a, b) => {
      const typeOrderA = getAssetTypeSortOrder(a.type);
      const typeOrderB = getAssetTypeSortOrder(b.type);
      if (typeOrderA !== typeOrderB) {
        return typeOrderA - typeOrderB;
      }
      // Within same type, sort by symbol (or name for simple types)
      const nameA = (isSimpleAssetType(a.type) ? a.name : a.symbol) || '';
      const nameB = (isSimpleAssetType(b.type) ? b.name : b.symbol) || '';
      return nameA.localeCompare(nameB);
    });
  }, [rawAssets]);

  // Check if any portfolio is masked (for "All Portfolios" view)
  const isMasked = portfolioId
    ? (portfolio?.masked ?? false)
    : portfolios.some(p => p.masked);

  useFocusEffect(
    useCallback(() => {
      // Save this as the last opened portfolio (unless viewing all)
      if (portfolioId) {
        setCurrentPortfolio(portfolioId);
      }
    }, [portfolioId, setCurrentPortfolio])
  );

  // Redirect to first portfolio if current portfolio doesn't exist
  useFocusEffect(
    useCallback(() => {
      if (portfolioId && !isLoading && !portfolio && portfolios.length > 0) {
        // Portfolio doesn't exist (maybe ID changed after migration)
        router.replace(`/portfolio/${portfolios[0].id}`);
      }
    }, [portfolioId, isLoading, portfolio, portfolios, router])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Invalidate all price and exchange rate queries
    await queryClient.invalidateQueries({ queryKey: queryKeys.prices.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.exchangeRates.all });
    setRefreshing(false);
  }, [queryClient]);

  const handleToggleMasked = useCallback(async () => {
    if (portfolio && portfolioId) {
      await updatePortfolioMutation.mutateAsync({
        id: portfolio.id,
        updates: { masked: !portfolio.masked },
      });
    }
  }, [portfolio, portfolioId, updatePortfolioMutation]);

  const allocationData = useMemo(() => {
    if (rawAssets.length === 0) {
      return { allocations: [], categoryAllocations: [], hasAnyCategories: false };
    }

    // Build maps with type/category info and portfolio currency values for allocations
    const statsWithType = new Map<string, { type: Asset['type']; currentValue: number | null }>();
    const statsWithCategory = new Map<string, { categoryId: string | null; currentValue: number | null }>();

    for (const asset of rawAssets) {
      const stat = assetStats.get(asset.id);
      // Use valueInPortfolioCurrency for allocation calculations
      const valueForAllocation = stat?.valueInPortfolioCurrency ?? null;
      statsWithType.set(asset.id, {
        type: asset.type,
        currentValue: valueForAllocation,
      });
      statsWithCategory.set(asset.id, {
        categoryId: asset.categoryId,
        currentValue: valueForAllocation,
      });
    }

    const typeResult = calculateAllocations(statsWithType);
    const categoryResult = calculateCategoryAllocations(statsWithCategory, categories);

    return {
      allocations: typeResult.allocations,
      categoryAllocations: categoryResult.categoryAllocations,
      hasAnyCategories: categoryResult.hasAnyCategories,
    };
  }, [rawAssets, assetStats, categories]);

  const renderAssetCard = ({ item }: { item: Asset }) => {
    const itemStats = assetStats.get(item.id);
    const gainColor = itemStats ? getGainColor(itemStats.unrealizedGain) : 'neutral';
    const isSimple = isSimpleAssetType(item.type);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/asset/${item.id}?portfolioId=${item.portfolioId}`)}
        style={{
          marginHorizontal: CONTENT_HORIZONTAL_PADDING,
          marginVertical: 4,
          padding: CONTENT_HORIZONTAL_PADDING,
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.cardBorder,
        }}
      >
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1} gap={2}>
            <XStack alignItems="center" gap={8}>
              <Text color={colors.text} fontSize={17} fontWeight="600">
                {isSimple ? item.name : item.symbol}
              </Text>
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
                {item.type}
              </Text>
            </XStack>
            {item.name && !isSimple && (
              <Text color={colors.textTertiary} fontSize={13} numberOfLines={1}>
                {item.name}
              </Text>
            )}
            {itemStats && (
              <XStack marginTop={2}>
                {isSimple ? (
                  <Text color={colors.textMuted} fontSize={12}>
                    {isMasked ? VALUE_MASK : `${formatQuantity(itemStats.totalQuantity)} ${itemStats.totalQuantity === 1 ? 'item' : 'items'}`}
                  </Text>
                ) : (
                  <QuantityAtPrice
                    quantity={itemStats.totalQuantity}
                    price={itemStats.averageCost}
                    currency={item.currency}
                    fontSize={12}
                    masked={isMasked}
                  />
                )}
              </XStack>
            )}
          </YStack>
          <YStack alignItems="flex-end" gap={2}>
            {itemStats?.currentValue !== null && itemStats?.currentValue !== undefined ? (
              <>
                <Text color={colors.text} fontSize={17} fontWeight="600">
                  {isMasked ? VALUE_MASK : formatCurrency(itemStats.currentValue, item.currency)}
                </Text>
                {!isSimple && (
                  <Text
                    fontSize={13}
                    fontWeight="600"
                    color={gainColor === 'gain' ? colors.gain : gainColor === 'loss' ? colors.loss : colors.textSecondary}
                  >
                    {isMasked ? formatPercent(itemStats.unrealizedGainPercent) : `${formatCurrency(itemStats.unrealizedGain, item.currency, { showSign: true })} (${formatPercent(itemStats.unrealizedGainPercent)})`}
                  </Text>
                )}
              </>
            ) : (
              <Spinner size="small" color={colors.textSecondary} />
            )}
          </YStack>
        </XStack>
      </TouchableOpacity>
    );
  };

  // Show loading state (or while redirecting to valid portfolio)
  if (portfolioId ? (!portfolio) : (portfolios.length === 0)) {
    return (
      <Page fallbackPath="/" showBack={false} >
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color={colors.text} />
        </YStack>
      </Page>
    );
  }

  const overallGainColor = stats ? getGainColor(stats.totalGain) : 'neutral';

  return (
    <Page
      showBack={false}
      leftComponent={
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={{ paddingHorizontal: 8, paddingVertical: 8 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
      }
      titleComponent={
        <PortfolioSwitcher
          currentPortfolio={portfolio ?? null}
          portfolios={portfolios}
          isAllPortfolios={!portfolioId}
        />
      }
      rightComponent={
        portfolioId ? (
          <HeaderIconButton icon="pencil" color={colors.text} href={`/portfolio/edit/${portfolioId}`} />
        ) : null
      }
    >
      {/* Portfolio Summary */}
      <YStack padding={CONTENT_HORIZONTAL_PADDING} gap={4}>
        <XStack alignItems="center" gap={8}>
          <Text color={colors.textSecondary} fontSize={13}>
            TOTAL VALUE
          </Text>
          {portfolioId && portfolio && (
            <TouchableOpacity
              onPress={handleToggleMasked}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={portfolio.masked ? 'eye-off-outline' : 'eye-outline'}
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </XStack>
        {stats ? (
          <>
            <XStack alignItems="baseline">
              <Text
                color={colors.text}
                fontSize={34}
                fontWeight="700"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {isMasked ? VALUE_MASK : formatCurrency(stats.totalValue, displayCurrency)}
              </Text>
              {pendingPriceCount > 0 && !isMasked && (
                <AnimatedEllipsis color={colors.textSecondary} fontSize={34} fontWeight="700" />
              )}
            </XStack>
            <XStack alignItems="center" gap={8} marginTop={4}>
              {!isMasked && (
                <Text
                  fontSize={15}
                  fontWeight="600"
                  color={overallGainColor === 'gain' ? colors.gain : overallGainColor === 'loss' ? colors.loss : colors.textSecondary}
                >
                  {formatCurrency(stats.totalGain, displayCurrency, { showSign: true })}
                </Text>
              )}
              <Text
                fontSize={13}
                fontWeight="600"
                color={overallGainColor === 'gain' ? colors.gain : overallGainColor === 'loss' ? colors.loss : colors.textSecondary}
                backgroundColor={
                  overallGainColor === 'gain'
                    ? colors.gainMuted
                    : overallGainColor === 'loss'
                      ? colors.lossMuted
                      : 'rgba(142, 142, 147, 0.15)'
                }
                paddingHorizontal={8}
                paddingVertical={3}
                borderRadius={6}
              >
                {formatPercent(stats.totalGainPercent)}
              </Text>
            </XStack>
          </>
        ) : (
          <Spinner size="small" color={colors.text} />
        )}
      </YStack>

      {/* Section header */}
      <XStack paddingHorizontal={CONTENT_HORIZONTAL_PADDING} paddingVertical={12} justifyContent="space-between" alignItems="center">
        <Text color={colors.textSecondary} fontSize={13} fontWeight="600">
          HOLDINGS
        </Text>
        <XStack alignItems="center" gap={12}>
          <Text color={colors.textTertiary} fontSize={13}>
            {portfolioAssets.length} {portfolioAssets.length === 1 ? 'asset' : 'assets'}
          </Text>
          {portfolioAssets.length > 0 && (
            <TouchableOpacity
              onPress={() => setShowTableConfig(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="options-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </XStack>
      </XStack>

      {isCompactView ? (
        // Table view (compact)
        <ScrollView
          contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.text}
            />
          }
        >
          {portfolioAssets.length > 0 ? (
            <>
              <YStack paddingHorizontal={CONTENT_HORIZONTAL_PADDING}>
                <AssetsTable
                  assets={portfolioAssets}
                  assetStats={assetStats}
                  masked={isMasked}
                />
              </YStack>

              {portfolioAssets.length >= 2 && (
                <YStack paddingHorizontal={CONTENT_HORIZONTAL_PADDING} paddingTop={24} gap={12}>
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text color={colors.textSecondary} fontSize={13} fontWeight="600" textTransform="uppercase">
                      Allocation
                    </Text>
                    {allocationData.hasAnyCategories && (
                      <SegmentedControl
                        options={[
                          { label: 'Type', value: 'type' },
                          { label: 'Category', value: 'category' },
                        ]}
                        value={allocationMode}
                        onChange={setAllocationMode}
                      />
                    )}
                  </XStack>
                  <AssetAllocationChart
                    allocations={allocationData.allocations}
                    categoryAllocations={allocationData.categoryAllocations}
                    currency={displayCurrency}
                    mode={allocationMode}
                    masked={isMasked}
                  />
                </YStack>
              )}
            </>
          ) : (
            <YStack flex={1} padding={32} alignItems="center" justifyContent="center">
              <Text color={colors.text} fontSize={18} fontWeight="600" textAlign="center">
                No assets yet
              </Text>
              <Text color={colors.textSecondary} fontSize={15} textAlign="center" marginTop={8}>
                {portfolioId ? 'Add your first asset to start tracking' : 'Add assets to your portfolios to see them here'}
              </Text>
            </YStack>
          )}
        </ScrollView>
      ) : (
        // Card view (default)
        <FlatList
          data={portfolioAssets}
          keyExtractor={(item) => item.id}
          renderItem={renderAssetCard}
          contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.text}
            />
          }
          ListFooterComponent={
            portfolioAssets.length >= 2 ? (
              <YStack paddingHorizontal={CONTENT_HORIZONTAL_PADDING} paddingTop={16} gap={12}>
                <XStack justifyContent="space-between" alignItems="center">
                  <Text color={colors.textSecondary} fontSize={13} fontWeight="600" textTransform="uppercase">
                    Allocation
                  </Text>
                  {allocationData.hasAnyCategories && (
                    <SegmentedControl
                      options={[
                        { label: 'Type', value: 'type' },
                        { label: 'Category', value: 'category' },
                      ]}
                      value={allocationMode}
                      onChange={setAllocationMode}
                    />
                  )}
                </XStack>
                <AssetAllocationChart
                  allocations={allocationData.allocations}
                  categoryAllocations={allocationData.categoryAllocations}
                  currency={displayCurrency}
                  mode={allocationMode}
                  masked={isMasked}
                />
              </YStack>
            ) : null
          }
          ListEmptyComponent={
            <YStack flex={1} padding={32} alignItems="center" justifyContent="center">
              <Text color={colors.text} fontSize={18} fontWeight="600" textAlign="center">
                No assets yet
              </Text>
              <Text color={colors.textSecondary} fontSize={15} textAlign="center" marginTop={8}>
                {portfolioId ? 'Add your first asset to start tracking' : 'Add assets to your portfolios to see them here'}
              </Text>
            </YStack>
          }
        />
      )}

      <TableColumnConfigDialog
        visible={showTableConfig}
        onClose={() => setShowTableConfig(false)}
      />

      {portfolioId && <AddAssetMenu portfolioId={portfolioId} />}
    </Page>
  );
}
