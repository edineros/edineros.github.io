import { useState, useEffect } from 'react';
import { alert } from '../../lib/utils/confirm';
import { router, useLocalSearchParams } from 'expo-router';
import { YStack, XStack, Text } from 'tamagui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Form } from '../../components/Form';
import { FormField } from '../../components/FormField';
import { LongButton } from '../../components/LongButton';
import { getAssetById } from '../../lib/db/assets';
import { createTransaction } from '../../lib/db/transactions';
import { formatCurrency } from '../../lib/utils/format';
import { isSimpleAssetType } from '../../lib/constants/assetTypes';
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

  const isSimple = asset ? isSimpleAssetType(asset.type) : false;

  useEffect(() => {
    if (assetId) {
      getAssetById(assetId).then(setAsset);
    }
  }, [assetId]);

  const total = () => {
    const qty = parseFloat(quantity) || 0;
    const price = isSimple ? 1 : (parseFloat(pricePerUnit) || 0);
    const feeVal = isSimple ? 0 : (parseFloat(fee) || 0);
    return qty * price + feeVal;
  };

  const handleCreate = async () => {
    const qty = parseFloat(quantity);
    const price = isSimple ? 1 : parseFloat(pricePerUnit);
    const feeVal = isSimple ? 0 : (parseFloat(fee) || 0);

    if (!qty || qty <= 0) {
      alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (!isSimple && (!price || price <= 0)) {
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
      <Form
        footer={
          <YStack gap={16}>
            <XStack
              justifyContent="space-between"
              alignItems="center"
              paddingVertical={12}
              borderTopWidth={1}
              borderTopColor="#1F1F1F"
            >
              <Text fontSize={15} color="#8E8E93">
                {isSimple ? 'Amount' : 'Total'}
              </Text>
              <Text fontSize={20} fontWeight="600" color="#FFFFFF">
                {formatCurrency(total(), asset.currency)}
              </Text>
            </XStack>
            <LongButton
              onPress={handleCreate}
              disabled={isCreating || !quantity || (!isSimple && !pricePerUnit)}
            >
              {isCreating ? 'Adding...' : 'Add Lot'}
            </LongButton>
          </YStack>
        }
      >
        <FormField
          label={isSimple ? `Amount (${asset.currency})` : 'Quantity'}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="0"
          keyboardType="decimal-pad"
          autoFocus
        />

        {!isSimple && (
          <>
            <FormField
              label={`Price per Unit (${asset.currency})`}
              value={pricePerUnit}
              onChangeText={setPricePerUnit}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />

            <FormField
              label={`Fee (${asset.currency})`}
              value={fee}
              onChangeText={setFee}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </>
        )}

        <FormField
          label="Date"
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
        />

        <FormField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Add any notes..."
          multiline
          numberOfLines={3}
        />
      </Form>
    </YStack>
  );
}
