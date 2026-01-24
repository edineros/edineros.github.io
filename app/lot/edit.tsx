import { useState, useEffect } from 'react';
import { Alert, ScrollView } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { YStack, XStack, Text, Button, Input, Label, Spinner } from 'tamagui';
import { getAssetById } from '../../lib/db/assets';
import { getTransactionById, updateTransaction } from '../../lib/db/transactions';
import { formatCurrency } from '../../lib/utils/format';
import type { Asset, Transaction } from '../../lib/types';

export default function EditLotScreen() {
  const { lotId, assetId } = useLocalSearchParams<{
    lotId: string;
    assetId: string;
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
      Alert.alert('Error', (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const total = () => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(pricePerUnit) || 0;
    const feeVal = parseFloat(fee) || 0;
    return qty * price + feeVal;
  };

  const handleSave = async () => {
    const qty = parseFloat(quantity);
    const price = parseFloat(pricePerUnit);
    const feeVal = parseFloat(fee) || 0;

    if (!qty || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (!price || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    if (!lotId) {
      Alert.alert('Error', 'Lot not found');
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
      Alert.alert('Error', (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Lot' }} />
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" />
        </YStack>
      </>
    );
  }

  if (!asset || !transaction) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Lot' }} />
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
          <Text>Lot not found</Text>
        </YStack>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Lot' }} />
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

          <Button
            size="$5"
            backgroundColor="$blue10"
            color="white"
            fontWeight="600"
            onPress={handleSave}
            disabled={isSaving || !quantity || !pricePerUnit}
            marginTop="$2"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </YStack>
      </ScrollView>
    </>
  );
}
