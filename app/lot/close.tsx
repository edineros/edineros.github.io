import { useState, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { alert } from '../../lib/utils/confirm';
import { router, useLocalSearchParams } from 'expo-router';
import { YStack, XStack, Text, Button, Input, Label, Card, Separator } from 'tamagui';
import { getAssetById } from '../../lib/db/assets';
import { getLotsForAsset, createTransaction } from '../../lib/db/transactions';
import { fetchPrice } from '../../lib/api/prices';
import { formatCurrency, formatQuantity, formatDate, formatPercent } from '../../lib/utils/format';
import type { Asset, Lot } from '../../lib/types';

export default function CloseLotScreen() {
  const { assetId, lotId, portfolioId } = useLocalSearchParams<{
    assetId: string;
    lotId: string;
    portfolioId: string;
  }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [lot, setLot] = useState<Lot | null>(null);
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [fee, setFee] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [assetId, lotId]);

  const loadData = async () => {
    if (!assetId || !lotId) {
      return;
    }

    const assetData = await getAssetById(assetId);
    setAsset(assetData);

    if (assetData) {
      const lots = await getLotsForAsset(assetId);
      const lotData = lots.find((l) => l.id === lotId);
      setLot(lotData || null);

      if (lotData) {
        setQuantity(lotData.remainingQuantity.toString());
      }

      const priceResult = await fetchPrice(assetData.symbol, assetData.type);
      if (priceResult) {
        setCurrentPrice(priceResult.price);
        setPricePerUnit(priceResult.price.toString());
      }
    }
  };

  const calculateGain = () => {
    if (!lot) return null;

    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(pricePerUnit) || 0;
    const feeVal = parseFloat(fee) || 0;

    const sellValue = qty * price - feeVal;
    const costBasis = qty * lot.purchasePrice;
    const gain = sellValue - costBasis;
    const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;

    return { gain, gainPercent, sellValue, costBasis };
  };

  const handleClose = async () => {
    const qty = parseFloat(quantity);
    const price = parseFloat(pricePerUnit);
    const feeVal = parseFloat(fee) || 0;

    if (!qty || qty <= 0) {
      alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (!lot || qty > lot.remainingQuantity) {
      alert('Error', 'Quantity exceeds available lot quantity');
      return;
    }

    if (!price || price <= 0) {
      alert('Error', 'Please enter a valid price');
      return;
    }

    if (!assetId || !lotId) {
      alert('Error', 'Asset or lot not found');
      return;
    }

    setIsCreating(true);
    try {
      await createTransaction(
        assetId,
        'sell',
        qty,
        price,
        new Date(date),
        {
          fee: feeVal,
          notes: notes.trim() || undefined,
          lotId: lotId,
        }
      );
      router.back();
    } catch (error) {
      alert('Error', (error as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCloseAll = () => {
    if (lot) {
      setQuantity(lot.remainingQuantity.toString());
    }
  };

  if (!asset || !lot) {
    return null;
  }

  const gainInfo = calculateGain();

  return (
    <ScrollView style={{ flex: 1 }}>
      <YStack flex={1} padding="$4" gap="$4">
        {/* Lot Info Card */}
        <Card bordered padding="$4">
          <Text fontSize="$5" fontWeight="600" marginBottom="$2">
            Closing lot for {asset.symbol}
          </Text>
          <YStack gap="$1">
            <XStack justifyContent="space-between">
              <Text color="$gray10">Available</Text>
              <Text fontWeight="500">{formatQuantity(lot.remainingQuantity)} units</Text>
            </XStack>
            <XStack justifyContent="space-between">
              <Text color="$gray10">Purchase Price</Text>
              <Text fontWeight="500">{formatCurrency(lot.purchasePrice, asset.currency)}</Text>
            </XStack>
            <XStack justifyContent="space-between">
              <Text color="$gray10">Purchase Date</Text>
              <Text fontWeight="500">{formatDate(lot.purchaseDate)}</Text>
            </XStack>
            {currentPrice !== null && (
              <XStack justifyContent="space-between">
                <Text color="$gray10">Current Price</Text>
                <Text fontWeight="500">{formatCurrency(currentPrice, asset.currency)}</Text>
              </XStack>
            )}
          </YStack>
        </Card>

        <YStack gap="$2">
          <XStack justifyContent="space-between" alignItems="center">
            <Label htmlFor="quantity">Quantity to Sell</Label>
            <Button size="$2" variant="outlined" onPress={handleCloseAll}>
              Sell All
            </Button>
          </XStack>
          <Input
            id="quantity"
            size="$4"
            placeholder="0"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            autoFocus
          />
        </YStack>

        <YStack gap="$2">
          <Label htmlFor="price">Sell Price ({asset.currency})</Label>
          <Input
            id="price"
            size="$4"
            placeholder="0.00"
            value={pricePerUnit}
            onChangeText={setPricePerUnit}
            keyboardType="decimal-pad"
          />
        </YStack>

        <YStack gap="$2">
          <Label htmlFor="fee">Fee ({asset.currency})</Label>
          <Input
            id="fee"
            size="$4"
            placeholder="0.00"
            value={fee}
            onChangeText={setFee}
            keyboardType="decimal-pad"
          />
        </YStack>

        <YStack gap="$2">
          <Label htmlFor="date">Sell Date</Label>
          <Input
            id="date"
            size="$4"
            placeholder="YYYY-MM-DD"
            value={date}
            onChangeText={setDate}
          />
        </YStack>

        <YStack gap="$2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Input
            id="notes"
            size="$4"
            placeholder="Add any notes..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </YStack>

        {/* Gain/Loss Summary */}
        {gainInfo && (
          <Card bordered padding="$4" marginTop="$2">
            <Text fontSize="$4" fontWeight="600" marginBottom="$2">
              Sale Summary
            </Text>
            <Separator marginVertical="$2" />
            <YStack gap="$2">
              <XStack justifyContent="space-between">
                <Text color="$gray10">Sell Value</Text>
                <Text fontWeight="500">{formatCurrency(gainInfo.sellValue, asset.currency)}</Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text color="$gray10">Cost Basis</Text>
                <Text fontWeight="500">{formatCurrency(gainInfo.costBasis, asset.currency)}</Text>
              </XStack>
              <Separator marginVertical="$1" />
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$4" fontWeight="600">
                  Realized Gain/Loss
                </Text>
                <Text
                  fontSize="$5"
                  fontWeight="700"
                  color={gainInfo.gain >= 0 ? '$green10' : '$red10'}
                >
                  {formatCurrency(gainInfo.gain, asset.currency, { showSign: true })}
                  {' '}({formatPercent(gainInfo.gainPercent)})
                </Text>
              </XStack>
            </YStack>
          </Card>
        )}

        <Button
          size="$5"
          backgroundColor="$red10"
          color="white"
          fontWeight="600"
          onPress={handleClose}
          disabled={isCreating || !quantity || !pricePerUnit}
          marginTop="$2"
        >
          {isCreating ? 'Closing...' : 'Close Lot'}
        </Button>
      </YStack>
    </ScrollView>
  );
}
