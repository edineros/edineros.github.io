import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, Pressable } from 'react-native';
import { Link, useLocalSearchParams, useFocusEffect, Stack } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { useAppStore } from '../../store';
import { HeaderIconButton } from '../../components/HeaderButtons';
import { QuantityAtPrice } from '../../components/QuantityAtPrice';
import { FloatingActionButton } from '../../components/FloatingActionButton';
import { PortfolioSwitcher } from '../../components/PortfolioSwitcher';
import { formatCurrency, formatPercent, getGainColor } from '../../lib/utils/format';
import { CONTENT_HORIZONTAL_PADDING } from '../../lib/constants/layout';
import type { Asset } from '../../lib/types';

export default function PortfolioDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [refreshing, setRefreshing] = useState(false);
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

  const renderAsset = ({ item }: { item: Asset }) => {
    const stats = assetStats.get(item.id);
    const gainColor = stats ? getGainColor(stats.unrealizedGain) : 'neutral';

    return (
      <Link href={`/asset/${item.id}?portfolioId=${id}`} asChild>
        <Pressable>
          <YStack
            marginHorizontal={CONTENT_HORIZONTAL_PADDING}
            marginVertical={4}
            padding={CONTENT_HORIZONTAL_PADDING}
            backgroundColor="#111111"
            borderRadius={12}
            borderWidth={1}
            borderColor="#1F1F1F"
            pressStyle={{ backgroundColor: '#1A1A1A' }}
          >
            <XStack justifyContent="space-between" alignItems="flex-start">
              <YStack flex={1} gap={2}>
                <XStack alignItems="center" gap={8}>
                  <Text color="#FFFFFF" fontSize={17} fontWeight="600">
                    {item.symbol}
                  </Text>
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
                    {item.type}
                  </Text>
                </XStack>
                {item.name && (
                  <Text color="#636366" fontSize={13} numberOfLines={1}>
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
                    <Text color="#FFFFFF" fontSize={17} fontWeight="600">
                      {formatCurrency(stats.currentValue, portfolio?.currency)}
                    </Text>
                    <Text
                      fontSize={13}
                      fontWeight="600"
                      color={gainColor === 'gain' ? '#00D897' : gainColor === 'loss' ? '#FF6B6B' : '#8E8E93'}
                    >
                      {formatCurrency(stats.unrealizedGain, portfolio?.currency, { showSign: true })} ({formatPercent(stats.unrealizedGainPercent)})
                    </Text>
                  </>
                ) : (
                  <Spinner size="small" color="#8E8E93" />
                )}
              </YStack>
            </XStack>
          </YStack>
        </Pressable>
      </Link>
    );
  };

  if (!portfolio) {
    return (
      <>
        <Stack.Screen options={{ title: '', }} />
        <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="#000000">
          <Spinner size="large" color="#FFFFFF" />
        </YStack>
      </>
    );
  }

  const overallGainColor = stats ? getGainColor(stats.totalGain) : 'neutral';

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <PortfolioSwitcher
              currentPortfolio={portfolio}
              portfolios={portfolios}
            />
          ),
          headerRight: () => (
            <HeaderIconButton icon="settings-outline" href={`/portfolio/edit/${id}`} />
          ),
        }}
      />
      <YStack flex={1} backgroundColor="#000000">
        {/* Portfolio Summary */}
        <YStack padding={CONTENT_HORIZONTAL_PADDING} gap={4}>
          <Text color="#8E8E93" fontSize={13}>
            TOTAL VALUE
          </Text>
          {stats?.totalValue !== null && stats?.totalValue !== undefined ? (
            <>
              <Text color="#FFFFFF" fontSize={34} fontWeight="700">
                {formatCurrency(stats.totalValue, portfolio.currency)}
              </Text>
              <XStack alignItems="center" gap={8} marginTop={4}>
                <Text
                  fontSize={15}
                  fontWeight="600"
                  color={overallGainColor === 'gain' ? '#00D897' : overallGainColor === 'loss' ? '#FF6B6B' : '#8E8E93'}
                >
                  {formatCurrency(stats.totalGain, portfolio.currency, { showSign: true })}
                </Text>
                <Text
                  fontSize={13}
                  fontWeight="600"
                  color={overallGainColor === 'gain' ? '#00D897' : overallGainColor === 'loss' ? '#FF6B6B' : '#8E8E93'}
                  backgroundColor={
                    overallGainColor === 'gain'
                      ? 'rgba(0, 216, 151, 0.15)'
                      : overallGainColor === 'loss'
                        ? 'rgba(255, 107, 107, 0.15)'
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
            <Spinner size="small" color="#FFFFFF" />
          )}
        </YStack>

        {/* Section header */}
        <XStack paddingHorizontal={CONTENT_HORIZONTAL_PADDING} paddingVertical={12} justifyContent="space-between" alignItems="center">
          <Text color="#8E8E93" fontSize={13} fontWeight="600">
            HOLDINGS
          </Text>
          <Text color="#636366" fontSize={13}>
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
              tintColor="#FFFFFF"
            />
          }
          ListEmptyComponent={
            <YStack flex={1} padding={32} alignItems="center" justifyContent="center">
              <Text color="#FFFFFF" fontSize={18} fontWeight="600" textAlign="center">
                No assets yet
              </Text>
              <Text color="#8E8E93" fontSize={15} textAlign="center" marginTop={8}>
                Add your first asset to start tracking
              </Text>
            </YStack>
          }
        />

        <FloatingActionButton href={`/asset/add?portfolioId=${id}`} />
      </YStack>
    </>
  );
}
