import { useCallback, useState, useMemo, useEffect } from 'react';
import { ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
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
import { formatCurrency, formatPercent, getGainColor } from '../../lib/utils/format';
import { CONTENT_HORIZONTAL_PADDING } from '../../lib/constants/layout';
import { VALUE_MASK } from '../../lib/constants/ui';
import { getAssetTypeSortOrder, isSimpleAssetType } from '../../lib/constants/assetTypes';
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
  const { setSelectedPortfolioIds, loadTableConfig, selectedPortfolioIds, loadSelectedPortfolioIds } = useAppStore();
  const updatePortfolioMutation = useUpdatePortfolio();

  // Load table config and persisted portfolio selection on mount
  useEffect(() => {
    loadTableConfig();
    loadSelectedPortfolioIds();
  }, [loadTableConfig, loadSelectedPortfolioIds]);

  // undefined for "all portfolios", otherwise the specific portfolio ID
  const portfolioId = id === ALL_PORTFOLIOS_ID ? undefined : id;

  // Load portfolios for switcher
  const { data: portfolios = [] } = usePortfolios();

  // Load categories
  const { data: categories = [] } = useCategories();

  // Load portfolio (for single portfolio view)
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolio(portfolioId);

  // Load assets (undefined = all assets, portfolioId = specific portfolio's assets)
  const { data: rawAssets = [] } = useAssets(portfolioId);

  // For multi-portfolio selection, use the first selected portfolio's currency
  const displayCurrency = useMemo(() => {
    if (portfolioId) return portfolio?.currency ?? 'EUR';
    if (selectedPortfolioIds !== null && selectedPortfolioIds.length > 0) {
      return portfolios.find((p) => p.id === selectedPortfolioIds[0])?.currency ?? portfolios[0]?.currency ?? 'EUR';
    }
    return portfolios[0]?.currency ?? 'EUR';
  }, [portfolioId, portfolio, selectedPortfolioIds, portfolios]);

  // Unified selection passed to the stats hook:
  //   [portfolioId] for a single portfolio, or selectedPortfolioIds (null/array) for the "all" route
  const statsPortfolioIds = useMemo(
    () => (portfolioId ? [portfolioId] : selectedPortfolioIds),
    [portfolioId, selectedPortfolioIds]
  );

  // Load stats
  const { portfolio: stats, assetStats, isLoading, pendingPriceCount } = usePortfolioStats(statsPortfolioIds, displayCurrency);

  // When in multi-portfolio mode, narrow the raw assets to just the selected portfolios.
  // Reused by both the table and the allocation chart.
  const filteredAssets = useMemo(() => {
    if (!portfolioId && selectedPortfolioIds !== null) {
      return rawAssets.filter((a) => selectedPortfolioIds.includes(a.portfolioId));
    }
    return rawAssets;
  }, [rawAssets, portfolioId, selectedPortfolioIds]);

  // Sort assets by type (using defined order), then by symbol/name within each type.
  const portfolioAssets = useMemo(() => {
    return [...filteredAssets].sort((a, b) => {
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
  }, [filteredAssets]);

  // Check if any relevant portfolio is masked
  const isMasked = useMemo(() => {
    if (portfolioId) return portfolio?.masked ?? false;
    if (selectedPortfolioIds !== null) {
      return portfolios.filter((p) => selectedPortfolioIds.includes(p.id)).some((p) => p.masked);
    }
    return portfolios.some((p) => p.masked);
  }, [portfolioId, portfolio, selectedPortfolioIds, portfolios]);

  useFocusEffect(
    useCallback(() => {
      // Persist the current single-portfolio view as the selection (for startup navigation)
      if (portfolioId) {
        setSelectedPortfolioIds([portfolioId]);
      }
    }, [portfolioId, setSelectedPortfolioIds])
  );

  // Redirect to first portfolio if current portfolio doesn't exist
  useFocusEffect(
    useCallback(() => {
      if (portfolioId && !portfolioLoading && !portfolio && portfolios.length > 0) {
        // Portfolio doesn't exist (maybe ID changed after migration)
        router.replace(`/portfolio/${portfolios[0].id}`);
      }
    }, [portfolioId, portfolioLoading, portfolio, portfolios, router])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Invalidate all price and exchange rate queries
    await queryClient.invalidateQueries({ queryKey: queryKeys.prices.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.exchangeRates.all });
    setRefreshing(false);
  }, [queryClient]);

  const handleToggleMasked = useCallback(async () => {
    if (portfolioId && portfolio) {
      // Single portfolio: simple toggle
      await updatePortfolioMutation.mutateAsync({
        id: portfolio.id,
        updates: { masked: !portfolio.masked },
      });
    } else {
      // Multi / all portfolios: apply the same new state to every relevant portfolio.
      // If any are currently masked, unmask all; if none are masked, mask all.
      const relevantPortfolios = selectedPortfolioIds !== null
        ? portfolios.filter((p) => selectedPortfolioIds.includes(p.id))
        : portfolios;
      const newMasked = !isMasked;
      await Promise.all(
        relevantPortfolios.map((p) =>
          updatePortfolioMutation.mutateAsync({ id: p.id, updates: { masked: newMasked } })
        )
      );
    }
  }, [portfolio, portfolioId, portfolios, selectedPortfolioIds, isMasked, updatePortfolioMutation]);

  const allocationData = useMemo(() => {
    if (filteredAssets.length === 0) {
      return { allocations: [], categoryAllocations: [], hasAnyCategories: false, pendingTypes: new Set<string>(), pendingCategoryIds: new Set<string | null>() };
    }

    const statsWithType = new Map<string, { type: Asset['type']; currentValue: number | null }>();
    const statsWithCategory = new Map<string, { categoryId: string | null; currentValue: number | null }>();

    // Track types/categories that have at least one asset with no portfolio currency value yet
    const pendingTypes = new Set<string>();
    const pendingCategoryIds = new Set<string | null>();

    for (const asset of filteredAssets) {
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

      // Mark type/category as pending if this asset's value couldn't be converted
      if (valueForAllocation === null) {
        pendingTypes.add(asset.type);
        pendingCategoryIds.add(asset.categoryId);
      }
    }

    const typeResult = calculateAllocations(statsWithType);
    const categoryResult = calculateCategoryAllocations(statsWithCategory, categories);

    return {
      allocations: typeResult.allocations,
      categoryAllocations: categoryResult.categoryAllocations,
      hasAnyCategories: categoryResult.hasAnyCategories,
      pendingTypes,
      pendingCategoryIds,
    };
  }, [filteredAssets, assetStats, categories]);

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
          <TouchableOpacity
            onPress={handleToggleMasked}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isMasked ? 'eye-off-outline' : 'eye-outline'}
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
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
                  pendingTypes={allocationData.pendingTypes}
                  pendingCategoryIds={allocationData.pendingCategoryIds}
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

      <TableColumnConfigDialog
        visible={showTableConfig}
        onClose={() => setShowTableConfig(false)}
      />

      {portfolioId && <AddAssetMenu portfolioId={portfolioId} />}
    </Page>
  );
}
