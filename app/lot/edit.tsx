import { useState, useEffect } from 'react';
import { alert } from '../../lib/utils/confirm';
import { router, useLocalSearchParams } from 'expo-router';
import { YStack, Text, Spinner } from 'tamagui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Form } from '../../components/Form';
import { LongButton } from '../../components/LongButton';
import { FormField } from '../../components/FormField';
import { InfoRow } from '../../components/InfoRow';
import { getAssetById } from '../../lib/db/assets';
import { getTransactionById, updateTransaction } from '../../lib/db/transactions';
import { formatCurrency, parseDecimal } from '../../lib/utils/format';
import type { Asset, Transaction } from '../../lib/types';

export default function EditLotScreen() {
  const { lotId, assetId, portfolioId } = useLocalSearchParams<{
    lotId: string;
    assetId: string;
    portfolioId?: string;
  }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [fee, setFee] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [lotId, assetId]);

  const loadData = async () => {
    try {
      const [assetData, txData] = await Promise.all([
        assetId ? getAssetById(assetId) : null,
        lotId ? getTransactionById(lotId) : null,
      ]);

      setAsset(assetData);
      setTransaction(txData);

      if (txData) {
        setQuantity(txData.quantity.toString());
        setPricePerUnit(txData.pricePerUnit.toString());
        setFee(txData.fee > 0 ? txData.fee.toString() : '');
        setDate(txData.date.toISOString().split('T')[0]);
        setNotes(txData.notes || '');
      }
    } catch (error) {
      alert('Error', (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const total = () => {
    const qty = parseDecimal(quantity) || 0;
    const price = parseDecimal(pricePerUnit) || 0;
    const feeVal = parseDecimal(fee) || 0;
    return qty * price + feeVal;
  };

  const handleSave = async () => {
    const qty = parseDecimal(quantity);
    const price = parseDecimal(pricePerUnit);
    const feeVal = parseDecimal(fee) || 0;

    if (!qty || qty <= 0) {
      alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (!price || price <= 0) {
      alert('Error', 'Please enter a valid price');
      return;
    }

    if (!lotId) {
      alert('Error', 'Lot not found');
      return;
    }

    setIsSaving(true);
    try {
      await updateTransaction(lotId, {
        quantity: qty,
        pricePerUnit: price,
        fee: feeVal,
        date: new Date(date),
        notes: notes.trim() || null,
      });
      router.back();
    } catch (error) {
      alert('Error', (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const fallbackPath = assetId && portfolioId ? `/asset/${assetId}?portfolioId=${portfolioId}` : '/';

  if (isLoading) {
    return (
      <YStack flex={1} backgroundColor="#000000">
        <ScreenHeader title="Edit Lot" showBack fallbackPath={fallbackPath} />
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" />
        </YStack>
      </YStack>
    );
  }

  if (!asset || !transaction) {
    return (
      <YStack flex={1} backgroundColor="#000000">
        <ScreenHeader title="Edit Lot" showBack fallbackPath={fallbackPath} />
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
          <Text>Lot not found</Text>
        </YStack>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="#000000">
      <ScreenHeader title="Edit Lot" showBack fallbackPath={fallbackPath} />
      <Form
        footer={
          <YStack gap={16}>
            <InfoRow
              label="Total"
              value={formatCurrency(total(), asset.currency)}
              bold
            />
            <LongButton
              onPress={handleSave}
              disabled={isSaving || !quantity || !pricePerUnit}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </LongButton>
          </YStack>
        }
      >
        <FormField
          label="Quantity"
          value={quantity}
          onChangeText={setQuantity}
          placeholder="0"
          keyboardType="decimal-pad"
        />

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
