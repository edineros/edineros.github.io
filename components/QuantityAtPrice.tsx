import { XStack, Text } from 'tamagui';
import { formatQuantity, formatCurrency } from '../lib/utils/format';
import { useColors } from '../lib/theme/store';
import { VALUE_MASK } from '../lib/constants/ui';

interface QuantityAtPriceProps {
  quantity: number;
  price: number;
  currency?: string;
  fontSize?: number | string;
  masked?: boolean;
}

/**
 * Displays "quantity @ price" with white-ish text for quantity and price.
 */
export function QuantityAtPrice({
  quantity,
  price,
  currency,
  fontSize = 12,
  masked = false,
}: QuantityAtPriceProps) {
  const colors = useColors();

  return (
    <XStack alignItems="center">
      <Text color={colors.textMuted} fontSize={fontSize}>
        {masked ? VALUE_MASK : formatQuantity(quantity)}
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
