import { useState, useEffect } from 'react';
import { alert } from '../../lib/utils/confirm';
import { router, useLocalSearchParams } from 'expo-router';
import { YStack, Text, Spinner } from 'tamagui';
import { Page } from '../../components/Page';
import { Form } from '../../components/Form';
import { LongButton } from '../../components/LongButton';
import { FormField } from '../../components/FormField';
import { InfoRow } from '../../components/InfoRow';
import { getAssetById } from '../../lib/db/assets';
import { getTransactionById, updateTransaction } from '../../lib/db/transactions';
import { formatCurrency, parseDecimal } from '../../lib/utils/format';
import { isSimpleAssetType } from '../../lib/constants/assetTypes';
import { useColors } from '../../lib/theme/store';
import type { Asset, Transaction } from '../../lib/types';

export default function EditLotScreen() {
  const { lotId, assetId, portfolioId } = useLocalSearchParams<{
    lotId: string;
    assetId: string;
    portfolioId?: string;
  }>();
  const colors = useColors();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [fee, setFee] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isSimple = asset ? isSimpleAssetType(asset.type) : false;

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
        if (assetData && isSimpleAssetType(assetData.type)) {
          // For simple assets, amount = quantity × pricePerUnit
          const amount = txData.quantity * txData.pricePerUnit;
          setQuantity(amount.toString());
          setPricePerUnit('1'); // Not used for simple assets
          setFee('');
        } else {
          setQuantity(txData.quantity.toString());
          setPricePerUnit(txData.pricePerUnit.toString());
          setFee(txData.fee > 0 ? txData.fee.toString() : '');
        }
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

    if (!lotId) {
      alert('Error', 'Lot not found');
      return;
    }

    setIsSaving(true);
    try {
      if (isSimple) {
        // For simple assets: amount is stored as pricePerUnit with quantity=1
        await updateTransaction(lotId, {
          quantity: 1,
          pricePerUnit: amount,
          fee: 0,
          date: new Date(date),
          notes: notes.trim() || null,
        });
      } else {
        const qty = amount;
        const price = parseDecimal(pricePerUnit)!;
        const feeVal = parseDecimal(fee) || 0;
        await updateTransaction(lotId, {
          quantity: qty,
          pricePerUnit: price,
          fee: feeVal,
          date: new Date(date),
          notes: notes.trim() || null,
        });
      }
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
              disabled={isSaving || !quantity || (!isSimple && !pricePerUnit)}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
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
