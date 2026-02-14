import { useCallback, useRef } from 'react';
import { ScrollView, TouchableOpacity, View, StyleSheet, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { YStack, Text, Spinner } from 'tamagui';
import { useRouter } from 'expo-router';
import { useColors } from '../lib/theme/store';
import { useAppStore, TableColumnId } from '../store';
import { formatCurrency, formatPercent, formatQuantity, getGainColor } from '../lib/utils/format';
import { isSimpleAssetType } from '../lib/constants/assetTypes';
import { VALUE_MASK } from '../lib/constants/ui';
import type { Asset, AssetWithStats } from '../lib/types';

interface AssetsTableProps {
  assets: Asset[];
  assetStats: Map<string, AssetWithStats>;
  masked?: boolean;
}

const FIRST_COLUMN_MIN_WIDTH = 90;
const COLUMN_WIDTH = 90;
const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 32;
const INDICATOR_WIDTH = 3;

export function AssetsTable({ assets, assetStats, masked = false }: AssetsTableProps) {
  const router = useRouter();
  const colors = useColors();
  const { tableConfig } = useAppStore();
  const headerScrollRef = useRef<ScrollView>(null);

  const visibleColumns = tableConfig.columns.filter(col => col.visible && col.id !== 'symbol' && col.id !== 'name');
  const scrollableColumnsWidth = visibleColumns.length * COLUMN_WIDTH;

  const handleAssetPress = useCallback((asset: Asset) => {
    router.push(`/asset/${asset.id}?portfolioId=${asset.portfolioId}`);
  }, [router]);

  const getCellValue = (columnId: TableColumnId, asset: Asset, stats: AssetWithStats | undefined) => {
    const isSimple = isSimpleAssetType(asset.type);

    switch (columnId) {
      case 'price':
        if (isSimple || !stats?.currentPrice) {
          return '—';
        }
        return masked ? VALUE_MASK : formatCurrency(stats.currentPrice, asset.currency);

      case 'amount':
        if (!stats) {
          return '—';
        }
        if (isSimple) {
          return masked ? VALUE_MASK : `${formatQuantity(stats.totalQuantity)}`;
        }
        return masked ? VALUE_MASK : formatQuantity(stats.totalQuantity);

      case 'value':
        if (stats?.currentValue == null) {
          return null; // Show spinner
        }
        return masked ?
          VALUE_MASK :
          formatCurrency(stats.currentValue, asset.currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

      case 'pnl':
        if (isSimple || stats?.unrealizedGain == null) {
          return '—';
        }
        return masked ?
          VALUE_MASK :
          formatCurrency(stats.unrealizedGain, asset.currency, { showSign: true, minimumFractionDigits: 0, maximumFractionDigits: 0 });

      case 'pnlPercent':
        if (isSimple || stats?.unrealizedGainPercent == null) {
          return '—';
        }
        return formatPercent(stats.unrealizedGainPercent);

      case 'today':
        if (isSimple || stats?.todayChangePercent == null) {
          return '—';
        }
        return formatPercent(stats.todayChangePercent);

      default:
        return '—';
    }
  };

  const getGainColorForCell = (columnId: TableColumnId, stats: AssetWithStats | undefined) => {
    if (columnId === 'pnl' || columnId === 'pnlPercent') {
      return stats ? getGainColor(stats.unrealizedGain) : 'neutral';
    }
    if (columnId === 'today') {
      return stats?.todayChangePercent != null ? getGainColor(stats.todayChangePercent) : 'neutral';
    }
    return 'neutral';
  };

  // Sync header scroll position when body scrolls
  const handleBodyScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    headerScrollRef.current?.scrollTo({ x: offsetX, animated: false });
  }, []);

  if (assets.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {/* Header row */}
      <View style={styles.headerRow}>
        {/* Frozen header - grows to fill space */}
        <View
          style={[
            styles.frozenHeaderCell,
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
        >
          <Text
            fontSize={11}
            fontWeight="500"
            color={colors.textSecondary}
            textTransform="uppercase"
            paddingLeft={INDICATOR_WIDTH + 6}
          >
            Symbol
          </Text>
        </View>

        {/* Scrollable header */}
        <View style={[styles.scrollableWrapper, { maxWidth: scrollableColumnsWidth }]}>
          <ScrollView
            ref={headerScrollRef}
            horizontal
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollableHeader}
          >
            {visibleColumns.map(col => (
              <View
                key={col.id}
                style={[
                  styles.headerCell,
                  { width: COLUMN_WIDTH, borderBottomColor: colors.border },
                ]}
              >
                <Text
                  fontSize={11}
                  fontWeight="500"
                  color={colors.textSecondary}
                  textTransform="uppercase"
                  numberOfLines={1}
                >
                  {col.label}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Data area */}
      <View style={styles.dataArea}>
        {/* Frozen column - grows to fill space */}
        <View style={styles.frozenColumn}>
          {assets.map((asset, index) => {
            const stats = assetStats.get(asset.id);
            const gainColor = stats ? getGainColor(stats.unrealizedGain) : 'neutral';
            const isSimple = isSimpleAssetType(asset.type);
            const isLastRow = index === assets.length - 1;

            return (
              <TouchableOpacity
                key={asset.id}
                activeOpacity={0.7}
                onPress={() => handleAssetPress(asset)}
                style={[
                  styles.frozenCell,
                  {
                    backgroundColor: colors.card,
                    borderBottomColor: isLastRow ? 'transparent' : colors.border,
                  },
                ]}
              >
                {/* Gain/loss indicator */}
                <View
                  style={[
                    styles.indicator,
                    {
                      backgroundColor:
                        gainColor === 'gain' ? colors.gain :
                          gainColor === 'loss' ? colors.loss :
                            colors.border,
                    },
                  ]}
                />
                <YStack flex={1} paddingLeft={6} justifyContent="center" gap={3}>
                  <Text
                    fontSize={13}
                    fontWeight="500"
                    color={colors.text}
                    numberOfLines={1}
                  >
                    {isSimple ? (asset.name || 'Item') : asset.symbol}
                  </Text>
                  {asset.name && tableConfig.columns.find(c => c.id === 'name')?.visible && !isSimple && (
                    <Text
                      fontSize={11}
                      color={colors.textTertiary}
                      numberOfLines={1}
                    >
                      {asset.name}
                    </Text>
                  )}
                </YStack>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Scrollable columns */}
        <View style={[styles.scrollableWrapper, { maxWidth: scrollableColumnsWidth }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={assets.length > 3}
            scrollEventThrottle={16}
            onScroll={handleBodyScroll}
          >
            <View>
              {assets.map((asset, index) => {
                const stats = assetStats.get(asset.id);
                const isLastRow = index === assets.length - 1;

                return (
                  <View key={asset.id} style={styles.scrollableRow}>
                    {visibleColumns.map(col => {
                      const value = getCellValue(col.id, asset, stats);
                      const cellGainColor = getGainColorForCell(col.id, stats);

                      return (
                        <TouchableOpacity
                          key={col.id}
                          activeOpacity={0.7}
                          onPress={() => handleAssetPress(asset)}
                          style={[
                            styles.cell,
                            {
                              width: COLUMN_WIDTH,
                              backgroundColor: colors.card,
                              borderBottomColor: isLastRow ? 'transparent' : colors.border,
                            },
                          ]}
                        >
                          {value === null ? (
                            <Spinner size="small" color={colors.textSecondary} />
                          ) : (
                            <Text
                              fontSize={13}
                              color={
                                cellGainColor === 'gain' ? colors.gain :
                                  cellGainColor === 'loss' ? colors.loss :
                                    colors.text
                              }
                              numberOfLines={1}
                              textAlign="right"
                            >
                              {value}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    height: HEADER_HEIGHT,
  },
  frozenHeaderCell: {
    flex: 1,
    minWidth: FIRST_COLUMN_MIN_WIDTH,
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  headerCell: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  scrollableWrapper: {
    flexShrink: 1,
    flexGrow: 0,
  },
  scrollableHeader: {
    flexDirection: 'row',
  },
  dataArea: {
    flexDirection: 'row',
  },
  frozenColumn: {
    flex: 1,
    minWidth: FIRST_COLUMN_MIN_WIDTH,
  },
  frozenCell: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_HEIGHT,
    borderBottomWidth: 1,
  },
  indicator: {
    width: INDICATOR_WIDTH,
    height: '100%',
  },
  scrollableRow: {
    flexDirection: 'row',
    height: ROW_HEIGHT,
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
});
