import { useState, useEffect } from 'react';
import { alert } from '../../lib/utils/confirm';
import { router, useLocalSearchParams } from 'expo-router';
import { YStack, Text, Spinner } from 'tamagui';
import { Page } from '../../components/Page';
import { Form } from '../../components/Form';
import { LongButton } from '../../components/LongButton';
import { FormField } from '../../components/FormField';
import { InfoRow } from '../../components/InfoRow';
import { useAsset } from '../../lib/hooks/useAssets';
import { useTransaction, useUpdateTransaction } from '../../lib/hooks/useTransactions';
import { formatCurrency, parseDecimal } from '../../lib/utils/format';
import { isSimpleAssetType } from '../../lib/constants/assetTypes';
import { useColors } from '../../lib/theme/store';

export default function EditLotScreen() {
  const { lotId, assetId, portfolioId } = useLocalSearchParams<{
    lotId: string;
    assetId: string;
    portfolioId?: string;
  }>();
  const colors = useColors();
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [fee, setFee] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  const { data: asset, isLoading: assetLoading } = useAsset(assetId);
  const { data: transaction, isLoading: txLoading } = useTransaction(lotId);
  const updateTransaction = useUpdateTransaction();

  const isLoading = assetLoading || txLoading;
  const isSimple = asset ? isSimpleAssetType(asset.type) : false;

  useEffect(() => {
    if (transaction && asset) {
      if (isSimpleAssetType(asset.type)) {
        // For simple assets, amount = quantity × pricePerUnit
        const amount = transaction.quantity * transaction.pricePerUnit;
        setQuantity(amount.toString());
        setPricePerUnit('1'); // Not used for simple assets
        setFee('');
      } else {
        setQuantity(transaction.quantity.toString());
        setPricePerUnit(transaction.pricePerUnit.toString());
        setFee(transaction.fee > 0 ? transaction.fee.toString() : '');
      }
      // Handle both Date objects and ISO strings (from cache serialization)
      const dateValue = transaction.date instanceof Date
        ? transaction.date.toISOString()
        : String(transaction.date);
      setDate(dateValue.split('T')[0]);
      setNotes(transaction.notes || '');
    }
  }, [transaction, asset]);

  const total = () => {
    if (isSimple) {
      // For simple assets, "quantity" field holds the amount
      return parseDecimal(quantity) || 0;
    }
    const qty = parseDecimal(quantity) || 0;
    const price = parseDecimal(pricePerUnit) || 0;
    const feeVal = parseDecimal(fee) || 0;
    return qty * price + feeVal;
  };

  const handleSave = async () => {
    const amount = parseDecimal(quantity);

    if (!amount || amount <= 0) {
      alert('Error', isSimple ? 'Please enter a valid amount' : 'Please enter a valid quantity');
      return;
    }

    if (!isSimple) {
      const price = parseDecimal(pricePerUnit);
      if (!price || price <= 0) {
        alert('Error', 'Please enter a valid price');
        return;
      }
    }

    if (!lotId || !assetId) {
      alert('Error', 'Lot not found');
      return;
    }

    try {
      if (isSimple) {
        // For simple assets: amount is stored as pricePerUnit with quantity=1
        await updateTransaction.mutateAsync({
          id: lotId,
          assetId,
          updates: {
            quantity: 1,
            pricePerUnit: amount,
            fee: 0,
            date: new Date(date),
            notes: notes.trim() || null,
          },
        });
      } else {
        const qty = amount;
        const price = parseDecimal(pricePerUnit)!;
        const feeVal = parseDecimal(fee) || 0;
        await updateTransaction.mutateAsync({
          id: lotId,
          assetId,
          updates: {
            quantity: qty,
            pricePerUnit: price,
            fee: feeVal,
            date: new Date(date),
            notes: notes.trim() || null,
          },
        });
      }
      router.back();
    } catch (error) {
      alert('Error', (error as Error).message);
    }
  };

  const fallbackPath = assetId && portfolioId ? `/asset/${assetId}?portfolioId=${portfolioId}` : '/';

  if (isLoading) {
    return (
      <Page title="Edit Lot" fallbackPath={fallbackPath}>
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color={colors.text} />
        </YStack>
      </Page>
    );
  }

  if (!asset || !transaction) {
    return (
      <Page title="Edit Lot" fallbackPath={fallbackPath}>
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
          <Text color={colors.text}>Lot not found</Text>
        </YStack>
      </Page>
    );
  }

  return (
    <Page title="Edit Lot" fallbackPath={fallbackPath}>
      <Form
        footer={
          <YStack gap={16}>
            <InfoRow
              label={isSimple ? 'Amount' : 'Total'}
              value={formatCurrency(total(), asset.currency)}
              bold
            />
            <LongButton
              onPress={handleSave}
              disabled={updateTransaction.isPending || !quantity || (!isSimple && !pricePerUnit)}
            >
              {updateTransaction.isPending ? 'Saving...' : 'Save Changes'}
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
    </Page>
  );
}
