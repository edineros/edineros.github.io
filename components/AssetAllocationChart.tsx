import { YStack, XStack, Text } from 'tamagui';
import { DonutChart, DonutSegment } from './DonutChart';
import type { AssetType } from '../lib/types';
import { formatCurrency, formatPercent } from '../lib/utils/format';
import { getAssetTypeColor, getAssetTypePlural } from '../lib/constants/assetTypes';

export interface AllocationData {
  type: AssetType;
  value: number;
  percentage: number;
}

interface AssetAllocationChartProps {
  allocations: AllocationData[];
  totalValue: number;
  currency: string;
}

export function AssetAllocationChart({
  allocations,
  totalValue,
  currency,
}: AssetAllocationChartProps) {
  // Filter out zero allocations and sort by value descending
  const sortedAllocations = allocations
    .filter((a) => a.value > 0)
    .sort((a, b) => b.value - a.value);

  if (sortedAllocations.length === 0) {
    return null;
  }

  // Convert to donut segments
  const segments: DonutSegment[] = sortedAllocations.map((allocation) => ({
    value: allocation.value,
    color: getAssetTypeColor(allocation.type),
    label: getAssetTypePlural(allocation.type),
  }));

  return (
    <YStack
      backgroundColor="#111111"
      borderRadius={12}
      borderWidth={1}
      borderColor="#1F1F1F"
      padding={16}
      gap={16}
    >
      {/* Chart */}
      <XStack justifyContent="center" paddingVertical={8}>
        <DonutChart segments={segments} />
      </XStack>

      {/* Legend */}
      <YStack gap={8}>
        {sortedAllocations.map((allocation) => (
          <XStack
            key={allocation.type}
            justifyContent="space-between"
            alignItems="center"
          >
            <XStack alignItems="center" gap={8}>
              <YStack
                width={12}
                height={12}
                borderRadius={3}
                backgroundColor={getAssetTypeColor(allocation.type)}
              />
              <Text color="#FFFFFF" fontSize={14}>
                {getAssetTypePlural(allocation.type)}
              </Text>
            </XStack>
            <XStack alignItems="center" gap={8}>
              <Text color="#8E8E93" fontSize={14}>
                {formatCurrency(allocation.value, currency)}
              </Text>
              <Text color="#FFFFFF" fontSize={14} fontWeight="500" minWidth={80} textAlign="right">
                {formatPercent(allocation.percentage, { showSign: false, minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </Text>
            </XStack>
          </XStack>
        ))}
      </YStack>
    </YStack>
  );
}

// Helper function to calculate allocations from asset stats
export function calculateAllocations(
  assetStats: Map<string, { type: AssetType; currentValue: number | null }>
): { allocations: AllocationData[]; totalValue: number } {
  const valuesByType = new Map<AssetType, number>();
  let totalValue = 0;

  for (const [, stats] of assetStats) {
    if (stats.currentValue !== null && stats.currentValue > 0) {
      const currentTypeValue = valuesByType.get(stats.type) || 0;
      valuesByType.set(stats.type, currentTypeValue + stats.currentValue);
      totalValue += stats.currentValue;
    }
  }

  const allocations: AllocationData[] = [];
  for (const [type, value] of valuesByType) {
    allocations.push({
      type,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
    });
  }

  return { allocations, totalValue };
}
