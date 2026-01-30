import { useCallback, useState, useMemo } from 'react';
import { FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { useAppStore } from '../../store';
import { ScreenHeader } from '../../components/ScreenHeader';
import { HeaderIconButton } from '../../components/HeaderButtons';
import { QuantityAtPrice } from '../../components/QuantityAtPrice';
import { AddAssetMenu } from '../../components/AddAssetMenu';
import { SegmentedControl } from '../../components/SegmentedControl';
import { PortfolioSwitcher } from '../../components/PortfolioSwitcher';
import {
  AssetAllocationChart,
  calculateAllocations,
  calculateTagAllocations,
  AllocationMode,
} from '../../components/AssetAllocationChart';
import { formatCurrency, formatPercent, getGainColor } from '../../lib/utils/format';
import { CONTENT_HORIZONTAL_PADDING } from '../../lib/constants/layout';
import { useColors } from '../../lib/theme/store';
import type { Asset } from '../../lib/types';

export default function PortfolioDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('type');
  const colors = useColors();
  const {
    portfolios,
    assets,
    assetStats,
    portfolioStats,
    loadPortfolios,
    loadAssets,
    loadPortfolioStats,
    refreshPrices,
  } = useAppStore();

  // Get portfolio directly from store (already loaded on list screen)
  const portfolio = portfolios.find(p => p.id === id) || null;
  const portfolioAssets = id ? assets.get(id) || [] : [];
  const stats = id ? portfolioStats.get(id) : null;

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        if (!id) {
          return;
        }

        // If portfolio not in store (direct URL navigation), load all portfolios
        if (!portfolio) {
          await loadPortfolios();
        }

        // Load assets first, then portfolio stats (which also calculates all asset stats)
        await loadAssets(id);
        await loadPortfolioStats(id);
      };

      loadData();
    }, [id, portfolio])
  );

  const onRefresh = useCallback(async () => {
    if (!id) {
      return;
    }
    setRefreshing(true);
    await refreshPrices();
    await loadAssets(id);
    await loadPortfolioStats(id);
    setRefreshing(false);
  }, [id]);

  const allocationData = useMemo(() => {
    if (!id) {
      return { allocations: [], tagAllocations: [], hasAnyTags: false };
    }

    const assets_list = assets.get(id);
    if (!assets_list || assets_list.length === 0) {
      return { allocations: [], tagAllocations: [], hasAnyTags: false };
    }

    // Build a map with type info from assets and value from assetStats
    const statsWithType = new Map<string, { type: Asset['type']; currentValue: number | null }>();
    const statsWithTags = new Map<string, { tags: string[]; currentValue: number | null }>();

    for (const asset of assets_list) {
      const stat = assetStats.get(asset.id);
      statsWithType.set(asset.id, {
        type: asset.type,
        currentValue: stat?.currentValue ?? null,
      });
      statsWithTags.set(asset.id, {
        tags: asset.tags || [],
        currentValue: stat?.currentValue ?? null,
      });
    }

    const typeResult = calculateAllocations(statsWithType);
    const tagResult = calculateTagAllocations(statsWithTags);

    return {
      allocations: typeResult.allocations,
      tagAllocations: tagResult.tagAllocations,
      hasAnyTags: tagResult.hasAnyTags,
    };
  }, [id, assets, assetStats]);

  const renderAsset = ({ item }: { item: Asset }) => {
    const stats = assetStats.get(item.id);
    const gainColor = stats ? getGainColor(stats.unrealizedGain) : 'neutral';

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/asset/${item.id}?portfolioId=${id}`)}
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
                {item.symbol}
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
            {item.name && (
              <Text color={colors.textTertiary} fontSize={13} numberOfLines={1}>
                {item.name}
              </Text>
            )}
            {stats && (
              <XStack marginTop={2}>
                <QuantityAtPrice
                  quantity={stats.totalQuantity}
                  price={stats.averageCost}
                  currency={item.currency}
                  fontSize={12}
                />
              </XStack>
            )}
          </YStack>
          <YStack alignItems="flex-end" gap={2}>
            {stats?.currentValue !== null && stats?.currentValue !== undefined ? (
              <>
                <Text color={colors.text} fontSize={17} fontWeight="600">
                  {formatCurrency(stats.currentValue, portfolio?.currency)}
                </Text>
                <Text
                  fontSize={13}
                  fontWeight="600"
                  color={gainColor === 'gain' ? colors.gain : gainColor === 'loss' ? colors.loss : colors.textSecondary}
                >
                  {formatCurrency(stats.unrealizedGain, portfolio?.currency, { showSign: true })} ({formatPercent(stats.unrealizedGainPercent)})
                </Text>
              </>
            ) : (
              <Spinner size="small" color={colors.textSecondary} />
            )}
          </YStack>
        </XStack>
      </TouchableOpacity>
    );
  };

  if (!portfolio) {
    return (
      <YStack flex={1} backgroundColor={colors.background}>
        <ScreenHeader showBack fallbackPath="/" />
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color={colors.text} />
        </YStack>
      </YStack>
    );
  }

  const overallGainColor = stats ? getGainColor(stats.totalGain) : 'neutral';

  return (
      <YStack flex={1} backgroundColor={colors.background}>
        <ScreenHeader
          showBack
          fallbackPath="/"
          titleComponent={
            <PortfolioSwitcher
              currentPortfolio={portfolio}
              portfolios={portfolios}
            />
          }
          rightComponent={
            <HeaderIconButton icon="settings-outline" href={`/portfolio/edit/${id}`} />
          }
        />
        {/* Portfolio Summary */}
        <YStack padding={CONTENT_HORIZONTAL_PADDING} gap={4}>
          <Text color={colors.textSecondary} fontSize={13}>
            TOTAL VALUE
          </Text>
          {stats?.totalValue !== null && stats?.totalValue !== undefined ? (
            <>
              <Text color={colors.text} fontSize={34} fontWeight="700">
                {formatCurrency(stats.totalValue, portfolio.currency)}
              </Text>
              <XStack alignItems="center" gap={8} marginTop={4}>
                <Text
                  fontSize={15}
                  fontWeight="600"
                  color={overallGainColor === 'gain' ? colors.gain : overallGainColor === 'loss' ? colors.loss : colors.textSecondary}
                >
                  {formatCurrency(stats.totalGain, portfolio.currency, { showSign: true })}
                </Text>
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
          <Text color={colors.textTertiary} fontSize={13}>
            {portfolioAssets.length} {portfolioAssets.length === 1 ? 'asset' : 'assets'}
          </Text>
        </XStack>

        <FlatList
          data={portfolioAssets}
          keyExtractor={(item) => item.id}
          renderItem={renderAsset}
          contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.text}
            />
          }
          ListFooterComponent={
            allocationData.allocations.length > 1 ? (
              <YStack paddingHorizontal={CONTENT_HORIZONTAL_PADDING} paddingTop={16} gap={12}>
                <XStack justifyContent="space-between" alignItems="center">
                  <Text color={colors.textSecondary} fontSize={13} fontWeight="600" textTransform="uppercase">
                    Allocation
                  </Text>
                  {allocationData.hasAnyTags && (
                    <SegmentedControl
                      options={[
                        { label: 'Type', value: 'type' },
                        { label: 'Tags', value: 'tags' },
                      ]}
                      value={allocationMode}
                      onChange={setAllocationMode}
                    />
                  )}
                </XStack>
                <AssetAllocationChart
                  allocations={allocationData.allocations}
                  tagAllocations={allocationData.tagAllocations}
                  currency={portfolio.currency}
                  mode={allocationMode}
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
                Add your first asset to start tracking
              </Text>
            </YStack>
          }
        />

        <AddAssetMenu portfolioId={id!} />
      </YStack>
  );
}
