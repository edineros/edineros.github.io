import { useState } from 'react';
import { alert } from '../../lib/utils/confirm';
import { router, useLocalSearchParams } from 'expo-router';
import { YStack } from 'tamagui';
import { Page } from '../../components/Page';
import { Form } from '../../components/Form';
import { FormField } from '../../components/FormField';
import { LongButton } from '../../components/LongButton';
import { InfoRow } from '../../components/InfoRow';
import { useAsset } from '../../lib/hooks/useAssets';
import { useCreateTransaction } from '../../lib/hooks/useTransactions';
import { formatCurrency, parseDecimal } from '../../lib/utils/format';
import { isSimpleAssetType } from '../../lib/constants/assetTypes';

export default function AddLotScreen() {
  const { assetId, portfolioId } = useLocalSearchParams<{
    assetId: string;
    portfolioId: string;
  }>();
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [fee, setFee] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const { data: asset } = useAsset(assetId);
  const createTransaction = useCreateTransaction();

  const isSimple = asset ? isSimpleAssetType(asset.type) : false;

  const total = () => {
    if (isSimple) {
      // For simple assets, "quantity" field holds the amount (which becomes pricePerUnit)
      return parseDecimal(quantity) || 0;
    }
    const qty = parseDecimal(quantity) || 0;
    const price = parseDecimal(pricePerUnit) || 0;
    const feeVal = parseDecimal(fee) || 0;
    return qty * price + feeVal;
  };

  const handleCreate = async () => {
    // For simple assets: amount is stored as pricePerUnit with quantity=1
    // For other assets: quantity and pricePerUnit are separate fields
    const amount = parseDecimal(quantity);
    const qty = isSimple ? 1 : amount;
    const price = isSimple ? amount : parseDecimal(pricePerUnit);
    const feeVal = isSimple ? 0 : (parseDecimal(fee) || 0);

    if (!amount || amount <= 0) {
      alert('Error', isSimple ? 'Please enter a valid amount' : 'Please enter a valid quantity');
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

    try {
      await createTransaction.mutateAsync({
        assetId,
        type: 'buy',
        quantity: qty!,
        pricePerUnit: price!,
        date: new Date(date),
        options: {
          fee: feeVal,
          notes: notes.trim() || undefined,
        },
      });
      router.back();
    } catch (error) {
      alert('Error', (error as Error).message);
    }
  };

  const fallbackPath = assetId && portfolioId ? `/asset/${assetId}?portfolioId=${portfolioId}` : '/';

  if (!asset) {
    return (
      <Page title="Add Lot" fallbackPath={fallbackPath}>
        <YStack flex={1} />
      </Page>
    );
  }

  return (
    <Page title="Add Lot" fallbackPath={fallbackPath}>
      <Form
        footer={
          <YStack gap={16}>
            <InfoRow
              label={isSimple ? 'Amount' : 'Total'}
              value={formatCurrency(total(), asset.currency)}
              bold
            />
            <LongButton
              onPress={handleCreate}
              disabled={createTransaction.isPending || !quantity || (!isSimple && !pricePerUnit)}
            >
              {createTransaction.isPending ? 'Adding...' : 'Add Lot'}
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
    </Page>
  );
}
