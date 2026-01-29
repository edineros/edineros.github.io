import { useEffect, useCallback, useState } from 'react';
import { FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { useAppStore } from '../store';
import { ScreenHeader } from '../components/ScreenHeader';
import { formatCurrency, formatPercent, getGainColor } from '../lib/utils/format';
import { CONTENT_HORIZONTAL_PADDING } from '../lib/constants/layout';
import type { Portfolio } from '../lib/types';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { LongButton } from '../components/LongButton';

const NEW_PORTFOLIO_URL = '/portfolio/create';

export default function PortfolioListScreen() {
  const router = useRouter();
  const { portfolios, portfolioStats, isLoading, loadPortfolios, loadPortfolioStats } =
    useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadPortfolios();
    }, [])
  );

  useEffect(() => {
    portfolios.forEach((p) => {
      if (!portfolioStats.has(p.id)) {
        loadPortfolioStats(p.id);
      }
    });
  }, [portfolios]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPortfolios();
    for (const p of portfolios) {
      await loadPortfolioStats(p.id);
    }
    setRefreshing(false);
  }, [portfolios]);

  const renderPortfolio = ({ item }: { item: Portfolio }) => {
    const stats = portfolioStats.get(item.id);
    const gainColor = stats ? getGainColor(stats.totalGain) : 'neutral';

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/portfolio/${item.id}`)}
        style={{
          marginHorizontal: CONTENT_HORIZONTAL_PADDING,
          marginVertical: 6,
          padding: CONTENT_HORIZONTAL_PADDING,
          backgroundColor: '#111111',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#1F1F1F',
        }}
      >
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1} gap={2}>
            <Text color="#FFFFFF" fontSize={17} fontWeight="600">
              {item.name}
            </Text>
            <Text color="#8E8E93" fontSize={13}>
              {stats?.assetCount ?? 0} assets
            </Text>
          </YStack>
          <YStack alignItems="flex-end" gap={2}>
            {stats?.totalValue !== null && stats?.totalValue !== undefined ? (
              <>
                <Text color="#FFFFFF" fontSize={20} fontWeight="700">
                  {formatCurrency(stats.totalValue, item.currency)}
                </Text>
                <XStack alignItems="center" gap={6}>
                  <Text
                    fontSize={13}
                    fontWeight="600"
                    color={gainColor === 'gain' ? '#00D897' : gainColor === 'loss' ? '#FF6B6B' : '#8E8E93'}
                  >
                    {formatCurrency(stats.totalGain, item.currency, { showSign: true })}
                  </Text>
                  <Text
                    fontSize={12}
                    fontWeight="600"
                    color={gainColor === 'gain' ? '#00D897' : gainColor === 'loss' ? '#FF6B6B' : '#8E8E93'}
                    backgroundColor={
                      gainColor === 'gain'
                        ? 'rgba(0, 216, 151, 0.15)'
                        : gainColor === 'loss'
                          ? 'rgba(255, 107, 107, 0.15)'
                          : 'rgba(142, 142, 147, 0.15)'
                    }
                    paddingHorizontal={6}
                    paddingVertical={2}
                    borderRadius={4}
                  >
                    {formatPercent(stats.totalGainPercent)}
                  </Text>
                </XStack>
              </>
            ) : (
              <Spinner size="small" color="#8E8E93" />
            )}
          </YStack>
        </XStack>
      </TouchableOpacity>
    );
  };

  if (isLoading && portfolios.length === 0) {
    return (
      <YStack flex={1} backgroundColor="#000000">
        <ScreenHeader title="Portfolios" />
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color="#FFFFFF" />
        </YStack>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="#000000">
      <ScreenHeader title="Portfolios" />

      {/* Total across all portfolios */}
      {portfolios.length > 0 && (
        <YStack paddingHorizontal={CONTENT_HORIZONTAL_PADDING} paddingBottom={20}>
          <Text color="#8E8E93" fontSize={13} marginBottom={4}>
            TOTAL BALANCE
          </Text>
          <Text color="#FFFFFF" fontSize={32} fontWeight="700">
            {(() => {
              let total = 0;
              let hasData = false;
              portfolios.forEach(p => {
                const s = portfolioStats.get(p.id);
                if (s?.totalValue != null) {
                  total += s.totalValue;
                  hasData = true;
                }
              });
              return hasData ? formatCurrency(total, portfolios[0]?.currency || 'EUR') : '—';
            })()}
          </Text>
        </YStack>
      )}

      <FlatList
        data={portfolios}
        keyExtractor={(item) => item.id}
        renderItem={renderPortfolio}
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
            <Text color="#FFFFFF" fontSize={20} fontWeight="600" textAlign="center">
              No portfolios yet
            </Text>
            <Text color="#8E8E93" fontSize={15} textAlign="center" marginTop={8}>
              Create your first portfolio to start tracking
            </Text>
          </YStack>
        }
      />

      {portfolios.length === 0 ? (
        <YStack position="absolute" bottom={24} left={CONTENT_HORIZONTAL_PADDING} right={CONTENT_HORIZONTAL_PADDING}>
          <LongButton onPress={() => router.push(NEW_PORTFOLIO_URL)}>
            Create Portfoltio
          </LongButton>
        </YStack>
      ) : (
        <FloatingActionButton href={NEW_PORTFOLIO_URL} />
      )}
    </YStack>
  );
}
