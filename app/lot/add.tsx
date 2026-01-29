import { useState, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { alert } from '../../lib/utils/confirm';
import { router, useLocalSearchParams } from 'expo-router';
import { YStack, XStack, Text, Input, Label } from 'tamagui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { LongButton } from '../../components/LongButton';
import { getAssetById } from '../../lib/db/assets';
import { createTransaction } from '../../lib/db/transactions';
import { formatCurrency } from '../../lib/utils/format';
import type { Asset } from '../../lib/types';

export default function AddLotScreen() {
  const { assetId, portfolioId } = useLocalSearchParams<{
    assetId: string;
    portfolioId: string;
  }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [fee, setFee] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (assetId) {
      getAssetById(assetId).then(setAsset);
    }
  }, [assetId]);

  const total = () => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(pricePerUnit) || 0;
    const feeVal = parseFloat(fee) || 0;
    return qty * price + feeVal;
  };

  const handleCreate = async () => {
    const qty = parseFloat(quantity);
    const price = parseFloat(pricePerUnit);
    const feeVal = parseFloat(fee) || 0;
    if (!qty || qty <= 0) {
      alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (!price || price <= 0) {
      alert('Error', 'Please enter a valid price');
      return;
    }

    if (!assetId) {
      alert('Error', 'Asset not found');
      return;
    }

    setIsCreating(true);
    try {
      await createTransaction(
        assetId,
        'buy',
        qty,
        price,
        new Date(date),
        {
          fee: feeVal,
          notes: notes.trim() || undefined,
        }
      );
      router.back();
    } catch (error) {
      alert('Error', (error as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  const fallbackPath = assetId && portfolioId ? `/asset/${assetId}?portfolioId=${portfolioId}` : '/';

  if (!asset) {
    return (
      <YStack flex={1} backgroundColor="#000000">
        <ScreenHeader title="Add Lot" showBack fallbackPath={fallbackPath} />
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="#000000">
      <ScreenHeader title="Add Lot" showBack fallbackPath={fallbackPath} />
      <ScrollView style={{ flex: 1 }}>
        <YStack flex={1} padding="$4" gap="$4">
          <YStack gap="$2">
            <Label htmlFor="quantity">Quantity</Label>
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
            <Label htmlFor="price">Price per Unit ({asset.currency})</Label>
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
            <Label htmlFor="date">Purchase Date</Label>
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

          <XStack
            justifyContent="space-between"
            alignItems="center"
            paddingVertical="$3"
            borderTopWidth={1}
            borderTopColor="$borderColor"
          >
            <Text fontSize="$4" color="$gray10">
              Total
            </Text>
            <Text fontSize="$6" fontWeight="600">
              {formatCurrency(total(), asset.currency)}
            </Text>
          </XStack>

          <LongButton
            onPress={handleCreate}
            disabled={isCreating || !quantity || !pricePerUnit}
            topSpacing="small"
          >
            {isCreating ? 'Adding...' : 'Add Lot'}
          </LongButton>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
