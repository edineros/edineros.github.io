import { XStack, Text } from 'tamagui';
import { formatQuantity, formatCurrency } from '../lib/utils/format';

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
  return (
    <XStack alignItems="center">
      <Text color="#CCCCCC" fontSize={fontSize}>
        {formatQuantity(quantity)}
      </Text>
      <Text color="#636366" fontSize={fontSize}>
        {' @ '}
      </Text>
      <Text color="#CCCCCC" fontSize={fontSize}>
        {formatCurrency(price, currency)}
      </Text>
    </XStack>
  );
}
