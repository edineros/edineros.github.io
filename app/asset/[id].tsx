import { useState, useCallback } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { confirm } from '../../lib/utils/confirm';
import { Page } from '../../components/Page';
import { HeaderIconButton } from '../../components/HeaderButtons';
import { QuantityAtPrice } from '../../components/QuantityAtPrice';
import { FloatingActionButton } from '../../components/FloatingActionButton';
import { CONTENT_HORIZONTAL_PADDING } from '../../lib/constants/layout';
import { YStack, XStack, Text, Card, Spinner, Separator, Tabs } from 'tamagui';
import { getAssetById } from '../../lib/db/assets';
import { getLotsForAsset, getTransactionsByAssetId, deleteTransaction } from '../../lib/db/transactions';
import { fetchPrice, refreshPrice } from '../../lib/api/prices';
import {
  formatCurrency,
  formatPercent,
  formatQuantity,
  formatDate,
  formatRelativeTime,
  getGainColor,
} from '../../lib/utils/format';
import { calculateLotStats } from '../../lib/utils/calculations';
import { isSimpleAssetType } from '../../lib/constants/assetTypes';
import type { Asset, Lot, Transaction } from '../../lib/types';
import { MicroButton } from '../../components/MicroButton';
import { useColors } from '../../lib/theme/store';

export default function AssetDetailScreen() {
  const { id, portfolioId } = useLocalSearchParams<{ id: string; portfolioId: string }>();
  const colors = useColors();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceLastUpdated, setPriceLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('lots');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id, portfolioId])
  );

  const loadData = async () => {
    if (!id) {
      return;
    }

    setIsLoading(true);
    try {
      const [assetData, lotsData, txData] = await Promise.all([
        getAssetById(id),
        getLotsForAsset(id),
        getTransactionsByAssetId(id),
      ]);

      setAsset(assetData);
      setLots(lotsData);
      setTransactions(txData);

      // Only fetch price for market assets (not simple assets)
      if (assetData && !isSimpleAssetType(assetData.type)) {
        const priceResult = await fetchPrice(assetData.symbol, assetData.type, assetData.currency);
        if (priceResult) {
          setCurrentPrice(priceResult.price);
          setPriceLastUpdated(priceResult.fetchedAt);
        }
      }
    } catch (error) {
      console.error('Error loading asset:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (asset && !isSimpleAssetType(asset.type)) {
      const priceResult = await refreshPrice(asset.symbol, asset.type, asset.currency);
      if (priceResult) {
        setCurrentPrice(priceResult.price);
        setPriceLastUpdated(priceResult.fetchedAt);
      }
    }
    await loadData();
    setRefreshing(false);
  }, [asset]);

  const handleDeleteTransaction = useCallback(async (tx: Transaction) => {
    const confirmed = await confirm({
      title: 'Delete Transaction',
      message: `Are you sure you want to delete this ${tx.type} transaction?`,
      confirmText: 'Delete',
      destructive: true,
    });
    if (confirmed) {
      await deleteTransaction(tx.id);
      loadData();
    }
  }, []);

  const handleDeleteItem = useCallback(async (lot: Lot) => {
    const confirmed = await confirm({
      title: 'Delete Item',
      message: 'Are you sure you want to delete this item?',
      confirmText: 'Delete',
      destructive: true,
    });
    if (confirmed) {
      await deleteTransaction(lot.buyTransactionId);
      loadData();
    }
  }, []);

  // Calculate totals
  const totalQuantity = lots.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
  const totalCost = lots.reduce(
    (sum, lot) => sum + lot.remainingQuantity * lot.purchasePrice,
    0
  );
  const averageCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;
  const currentValue = currentPrice !== null ? totalQuantity * currentPrice : null;
  const unrealizedGain = currentValue !== null ? currentValue - totalCost : null;
  const unrealizedGainPercent =
    unrealizedGain !== null && totalCost > 0 ? (unrealizedGain / totalCost) * 100 : null;

  // Simplified item renderer for simple assets (cash, real-estate, other)
  const renderSimpleItem = ({ item }: { item: Lot }) => (
    <Card
      elevate
      bordered
      marginHorizontal={CONTENT_HORIZONTAL_PADDING}
      marginVertical={4}
      padding={16}
      backgroundColor="$background"
    >
      <XStack justifyContent="space-between" alignItems="flex-start">
        <YStack flex={1}>
          <Text fontSize="$4" fontWeight="600" color="$color">
            {formatCurrency(item.remainingQuantity * item.purchasePrice, asset?.currency)}
          </Text>
          <Text fontSize="$2" color="$gray10" marginTop={2}>
            {formatDate(item.purchaseDate)}
          </Text>
          {item.notes && (
            <Text fontSize="$2" color="$gray9" marginTop={4}>
              {item.notes}
            </Text>
          )}
        </YStack>
      </XStack>
      <XStack marginTop="$3" gap="$2" justifyContent="flex-end">
        <MicroButton href={`/lot/edit?lotId=${item.id}&assetId=${id}&portfolioId=${portfolioId}`}>
          Edit
        </MicroButton>
        <MicroButton theme="red" onPress={() => handleDeleteItem(item)}>
          Delete
        </MicroButton>
      </XStack>
    </Card>
  );

  // Lot renderer for market assets (stocks, crypto, etc.)
  const renderLot = ({ item }: { item: Lot }) => {
    const stats = calculateLotStats(item, currentPrice);

    return (
      <Card
        elevate
        bordered
        marginHorizontal={CONTENT_HORIZONTAL_PADDING}
        marginVertical={4}
        padding={16}
        backgroundColor="$background"
      >
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1}>
            <QuantityAtPrice
              quantity={item.remainingQuantity}
              price={item.purchasePrice}
              currency={asset?.currency}
              fontSize="$3"
            />
            <Text fontSize="$2" color="$gray10" marginTop={2}>
              {formatDate(item.purchaseDate)}
            </Text>
            {item.remainingQuantity !== item.originalQuantity && (
              <Text fontSize="$2" color="$gray9">
                (Originally {formatQuantity(item.originalQuantity)})
              </Text>
            )}
            {item.notes && (
              <Text fontSize="$2" color="$gray9" marginTop={4}>
                {item.notes}
              </Text>
            )}
          </YStack>
          <YStack alignItems="flex-end">
            {stats.currentValue !== null ? (
              <>
                <Text fontSize="$4" fontWeight="600">
                  {formatCurrency(stats.currentValue, asset?.currency)}
                </Text>
                <Text
                  fontSize="$3"
                  color={
                    getGainColor(stats.unrealizedGain) === 'gain'
                      ? '$green10'
                      : getGainColor(stats.unrealizedGain) === 'loss'
                        ? '$red10'
                        : '$gray10'
                  }
                >
                  {formatCurrency(stats.unrealizedGain, asset?.currency, { showSign: true })}{' '}
                  ({formatPercent(stats.unrealizedGainPercent)})
                </Text>
              </>
            ) : (
              <Text color="$gray10">—</Text>
            )}
          </YStack>
        </XStack>
        <XStack marginTop="$3" gap="$2" justifyContent="flex-end">
          <MicroButton href={`/lot/edit?lotId=${item.id}&assetId=${id}&portfolioId=${portfolioId}`}>
            Edit
          </MicroButton>
          <MicroButton href={`/lot/close?assetId=${id}&lotId=${item.id}&portfolioId=${portfolioId}`}>
            Close Lot
          </MicroButton>
        </XStack>
      </Card>
    );
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <Card
      elevate
      bordered
      marginHorizontal={CONTENT_HORIZONTAL_PADDING}
      marginVertical={4}
      padding={16}
      backgroundColor="$background"
    >
      <XStack justifyContent="space-between" alignItems="flex-start">
        <YStack flex={1}>
          <XStack alignItems="center" gap="$2">
            <Text
              fontSize="$4"
              fontWeight="600"
              color={item.type === 'buy' ? '$green10' : '$red10'}
            >
              {item.type.toUpperCase()}
            </Text>
            <Text fontSize="$3" color="$gray10">
              {formatDate(item.date)}
            </Text>
          </XStack>
          <XStack marginTop="$1">
            <QuantityAtPrice
              quantity={item.quantity}
              price={item.pricePerUnit}
              currency={asset?.currency}
              fontSize="$3"
            />
          </XStack>
          {item.notes && (
            <Text fontSize="$2" color="$gray9" marginTop="$1">
              {item.notes}
            </Text>
          )}
        </YStack>
        <YStack alignItems="flex-end">
          <Text fontSize="$4" fontWeight="600">
            {formatCurrency(item.quantity * item.pricePerUnit, asset?.currency)}
          </Text>
          {item.fee > 0 && (
            <Text fontSize="$2" color="$gray10">
              Fee: {formatCurrency(item.fee, asset?.currency)}
            </Text>
          )}
        </YStack>
      </XStack>
      <XStack marginTop="$2" justifyContent="flex-end">
        <MicroButton
          theme="red"
          onPress={() => handleDeleteTransaction(item)}
        >
          Delete
        </MicroButton>
      </XStack>
    </Card>
  );

  if (isLoading || !asset) {
    return (
      <Page fallbackPath={portfolioId ? `/portfolio/${portfolioId}` : '/'}>
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color={colors.text} />
        </YStack>
      </Page>
    );
  }

  return (
    <Page
      title={asset?.name ?? asset?.symbol}
      fallbackPath={portfolioId ? `/portfolio/${portfolioId}` : '/'}
      rightComponent={
        <HeaderIconButton
          icon="pencil"
          color={colors.text}
          href={`/asset/edit/${id}?portfolioId=${portfolioId}`}
        />
      }
    >
      {/* Asset Summary Card */}
      <Card elevate bordered marginHorizontal={CONTENT_HORIZONTAL_PADDING} marginVertical={8} padding={16} backgroundColor="$background">
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack>
            <XStack alignItems="center" gap="$2">
              <Text fontSize="$7" fontWeight="700" color="$color">
                {asset.symbol}
              </Text>
              <Text
                fontSize="$2"
                backgroundColor="$gray5"
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$2"
                color="$gray11"
              >
                {asset.type.toUpperCase()}
              </Text>
            </XStack>
            {asset.name && (
              <Text fontSize="$3" color="$gray10">
                {asset.name}
              </Text>
            )}
          </YStack>
          {!isSimpleAssetType(asset.type) && (
            <YStack alignItems="flex-end">
              {currentPrice !== null ? (
                <>
                  <Text fontSize="$6" fontWeight="600" color="$color">
                    {formatCurrency(currentPrice, asset.currency)}
                  </Text>
                  {priceLastUpdated && (
                    <Text fontSize="$2" color="$gray9">
                      {formatRelativeTime(priceLastUpdated)}
                    </Text>
                  )}
                </>
              ) : (
                <Text color="$gray10">Price unavailable</Text>
              )}
            </YStack>
          )}
        </XStack>

        <Separator marginVertical="$3" />

        <XStack justifyContent="space-between">
          <YStack>
            <Text fontSize="$2" color="$gray10">
              {isSimpleAssetType(asset.type) ? 'Items' : 'Holdings'}
            </Text>
            <Text fontSize="$5" fontWeight="600">
              {isSimpleAssetType(asset.type) ? `${formatQuantity(totalQuantity)} ${totalQuantity === 1 ? 'item' : 'items'}` : formatQuantity(totalQuantity)}
            </Text>
            {!isSimpleAssetType(asset.type) && (
              <Text fontSize="$2" color="$gray10">
                Avg. Cost: {formatCurrency(averageCost, asset.currency)}
              </Text>
            )}
          </YStack>
          <YStack alignItems="flex-end">
            <Text fontSize="$2" color="$gray10">
              Total Value
            </Text>
            {isSimpleAssetType(asset.type) ? (
              <Text fontSize="$5" fontWeight="600">
                {formatCurrency(totalCost, asset.currency)}
              </Text>
            ) : currentValue !== null ? (
              <>
                <Text fontSize="$5" fontWeight="600">
                  {formatCurrency(currentValue, asset.currency)}
                </Text>
                <Text
                  fontSize="$3"
                  color={
                    getGainColor(unrealizedGain) === 'gain'
                      ? '$green10'
                      : getGainColor(unrealizedGain) === 'loss'
                        ? '$red10'
                        : '$gray10'
                  }
                >
                  {formatCurrency(unrealizedGain, asset.currency, { showSign: true })}{' '}
                  ({formatPercent(unrealizedGainPercent)})
                </Text>
              </>
            ) : (
              <Text fontSize="$5" color="$gray10">
                —
              </Text>
            )}
          </YStack>
        </XStack>
      </Card>

      {/* Simple assets: show items list without tabs */}
      {isSimpleAssetType(asset.type) ? (
        <YStack flex={1}>
          <FlatList
            data={lots}
            keyExtractor={(item) => item.id}
            renderItem={renderSimpleItem}
            contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <YStack flex={1} padding="$8" alignItems="center" justifyContent="center">
                <Text fontSize="$5" color="$gray10" textAlign="center">
                  No items yet
                </Text>
                <Text fontSize="$3" color="$gray9" textAlign="center" marginTop="$2">
                  Add an item to track this asset
                </Text>
              </YStack>
            }
          />
        </YStack>
      ) : (
        /* Market assets: show Lots/Transactions tabs */
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          flexDirection="column"
          flex={1}
        >
          <Tabs.List paddingHorizontal={CONTENT_HORIZONTAL_PADDING} justifyContent="space-between">
            <Tabs.Tab value="lots" width="49%">
              <Text>Lots ({lots.length})</Text>
            </Tabs.Tab>
            <Tabs.Tab value="transactions" width="49%">
              <Text>Transactions ({transactions.length})</Text>
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Content value="lots" flex={1}>
            <FlatList
              data={lots}
              keyExtractor={(item) => item.id}
              renderItem={renderLot}
              contentContainerStyle={{ paddingVertical: 8, flexGrow: 1 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <YStack flex={1} padding="$8" alignItems="center" justifyContent="center">
                  <Text fontSize="$5" color="$gray10" textAlign="center">
                    No lots yet
                  </Text>
                  <Text fontSize="$3" color="$gray9" textAlign="center" marginTop="$2">
                    Add a lot to track your holdings
                  </Text>
                </YStack>
              }
            />
          </Tabs.Content>

          <Tabs.Content value="transactions" flex={1}>
            <FlatList
              data={transactions}
              keyExtractor={(item) => item.id}
              renderItem={renderTransaction}
              contentContainerStyle={{ paddingVertical: 8, flexGrow: 1 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <YStack flex={1} padding="$8" alignItems="center" justifyContent="center">
                  <Text fontSize="$5" color="$gray10" textAlign="center">
                    No transactions yet
                  </Text>
                </YStack>
              }
            />
          </Tabs.Content>
        </Tabs>
      )}

      <FloatingActionButton href={`/lot/add?assetId=${id}&portfolioId=${portfolioId}`} />
    </Page>
  );
}
