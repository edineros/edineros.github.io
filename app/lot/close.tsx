import { useState, useEffect } from 'react';
import { alert } from '../../lib/utils/confirm';
import { router, useLocalSearchParams } from 'expo-router';
import { YStack, Separator } from 'tamagui';
import { Page } from '../../components/Page';
import { Form } from '../../components/Form';
import { FormField } from '../../components/FormField';
import { LongButton } from '../../components/LongButton';
import { InfoRow } from '../../components/InfoRow';
import { InfoLabel } from '../../components/InfoLabel';
import { TextButton } from '../../components/TextButton';
import { getAssetById } from '../../lib/db/assets';
import { getLotsForAsset, createTransaction } from '../../lib/db/transactions';
import { fetchPrice } from '../../lib/api/prices';
import { formatCurrency, formatQuantity, formatDate, formatPercent, parseDecimal } from '../../lib/utils/format';
import { useColors } from '../../lib/theme/store';
import type { Asset, Lot } from '../../lib/types';

export default function CloseLotScreen() {
  const { assetId, lotId, portfolioId } = useLocalSearchParams<{
    assetId: string;
    lotId: string;
    portfolioId: string;
  }>();
  const colors = useColors();
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

      const priceResult = await fetchPrice(assetData.symbol, assetData.type, assetData.currency);
      if (priceResult) {
        setCurrentPrice(priceResult.price);
        setPricePerUnit(priceResult.price.toString());
      }
    }
  };

  const calculateGain = () => {
    if (!lot) return null;

    const qty = parseDecimal(quantity) || 0;
    const price = parseDecimal(pricePerUnit) || 0;
    const feeVal = parseDecimal(fee) || 0;

    const sellValue = qty * price - feeVal;
    const costBasis = qty * lot.purchasePrice;
    const gain = sellValue - costBasis;
    const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;

    return { gain, gainPercent, sellValue, costBasis };
  };

  const handleClose = async () => {
    const qty = parseDecimal(quantity);
    const price = parseDecimal(pricePerUnit);
    const feeVal = parseDecimal(fee) || 0;

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

  const fallbackPath = assetId && portfolioId ? `/asset/${assetId}?portfolioId=${portfolioId}` : '/';

  if (!asset || !lot) {
    return (
      <Page title="Sell Position" fallbackPath={fallbackPath}>
        <YStack flex={1} />
      </Page>
    );
  }

  const gainInfo = calculateGain();

  return (
    <Page title="Sell Position" fallbackPath={fallbackPath}>
      <Form
        footer={
          <LongButton
            onPress={handleClose}
            disabled={isCreating || !quantity || !pricePerUnit}
            variant="destructive"
          >
            {isCreating ? 'Closing...' : 'Close Lot'}
          </LongButton>
        }
      >
        {/* Lot Info Card */}
        <YStack
          backgroundColor={colors.card}
          borderRadius={12}
          borderWidth={1}
          borderColor={colors.cardBorder}
          padding={16}
          gap={8}
        >
          <InfoLabel>Closing lot for {asset.symbol}</InfoLabel>
          <Separator backgroundColor={colors.border} />
          <InfoRow label="Available" value={`${formatQuantity(lot.remainingQuantity)} units`} />
          <InfoRow label="Purchase Price" value={formatCurrency(lot.purchasePrice, asset.currency)} />
          <InfoRow label="Purchase Date" value={formatDate(lot.purchaseDate)} />
          {currentPrice !== null && (
            <InfoRow label="Current Price" value={formatCurrency(currentPrice, asset.currency)} />
          )}
        </YStack>

        <FormField
          label="Quantity to Sell"
          labelRight={<TextButton onPress={handleCloseAll}>Sell All</TextButton>}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="0"
          keyboardType="decimal-pad"
        />

        <FormField
          label={`Sell Price (${asset.currency})`}
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
          label="Sell Date"
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

        {gainInfo && (
          <YStack
            backgroundColor={colors.card}
            borderRadius={12}
            borderWidth={1}
            borderColor={colors.cardBorder}
            padding={16}
            gap={12}
          >
            <InfoLabel>Sale Summary</InfoLabel>
            <Separator backgroundColor={colors.border} />
            <YStack gap={8}>
              <InfoRow label="Sell Value" value={formatCurrency(gainInfo.sellValue, asset.currency)} />
              <InfoRow label="Cost Basis" value={formatCurrency(gainInfo.costBasis, asset.currency)} />
              <Separator backgroundColor={colors.border} />
              <InfoRow
                label="Realized Gain/Loss"
                value={`${formatCurrency(gainInfo.gain, asset.currency, { showSign: true })} (${formatPercent(gainInfo.gainPercent)})`}
                valueColor={gainInfo.gain >= 0 ? colors.gain : colors.loss}
                bold
              />
            </YStack>
          </YStack>
        )}
      </Form>
    </Page>
  );
}
