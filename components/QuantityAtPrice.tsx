import { XStack, Text } from 'tamagui';
import { formatQuantity, formatCurrency } from '../lib/utils/format';
import { useColors } from '../lib/theme/store';

interface QuantityAtPriceProps {
  quantity: number;
  price: number;
  currency?: string;
  fontSize?: number | string;
}

/**
 * Displays "quantity @ price" with white-ish text for quantity and price.
 */
export function QuantityAtPrice({
  quantity,
  price,
  currency,
  fontSize = 12,
}: QuantityAtPriceProps) {
  const colors = useColors();

  return (
    <XStack alignItems="center">
      <Text color={colors.textMuted} fontSize={fontSize}>
        {formatQuantity(quantity)}
      </Text>
      <Text color={colors.textTertiary} fontSize={fontSize}>
        {' @ '}
      </Text>
      <Text color={colors.textMuted} fontSize={fontSize}>
        {formatCurrency(price, currency)}
      </Text>
    </XStack>
  );
}
