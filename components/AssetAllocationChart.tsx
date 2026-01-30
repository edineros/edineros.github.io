import { YStack, XStack, Text } from 'tamagui';
import { DonutChart, DonutSegment } from './DonutChart';
import type { AssetType } from '../lib/types';
import { formatCurrency, formatPercent } from '../lib/utils/format';
import { getAssetTypeColor, getAssetTypePlural } from '../lib/constants/assetTypes';
import { useColors } from '../lib/theme/store';

export type AllocationMode = 'type' | 'tags';

export interface AllocationData {
  type: AssetType;
  value: number;
  percentage: number;
}

export interface TagAllocationData {
  tag: string;
  value: number;
  percentage: number;
  color: string;
}

interface AssetAllocationChartProps {
  allocations: AllocationData[];
  tagAllocations?: TagAllocationData[];
  currency: string;
  mode: AllocationMode;
}

export function AssetAllocationChart({
  allocations,
  tagAllocations = [],
  currency,
  mode,
}: AssetAllocationChartProps) {
  const colors = useColors();

  // Filter out zero allocations and sort by value descending
  const sortedTypeAllocations = allocations
    .filter((a) => a.value > 0)
    .sort((a, b) => b.value - a.value);

  const sortedTagAllocations = tagAllocations
    .filter((a) => a.value > 0)
    .sort((a, b) => b.value - a.value);

  const showTypeView = mode === 'type';
  const currentAllocations = showTypeView ? sortedTypeAllocations : sortedTagAllocations;

  if (currentAllocations.length === 0) {
    return null;
  }

  // Convert to donut segments
  const segments: DonutSegment[] = showTypeView
    ? sortedTypeAllocations.map((allocation) => ({
        value: allocation.value,
        color: getAssetTypeColor(allocation.type),
        label: getAssetTypePlural(allocation.type),
      }))
    : sortedTagAllocations.map((allocation) => ({
        value: allocation.value,
        color: allocation.color,
        label: allocation.tag,
      }));

  return (
    <YStack
      backgroundColor={colors.card}
      borderRadius={12}
      borderWidth={1}
      borderColor={colors.cardBorder}
      padding={16}
      gap={16}
    >
      {/* Chart */}
      <XStack justifyContent="center" paddingVertical={8}>
        <DonutChart segments={segments} />
      </XStack>

      {/* Legend */}
      <YStack gap={8}>
        {showTypeView
          ? sortedTypeAllocations.map((allocation) => (
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
                  <Text color={colors.text} fontSize={14}>
                    {getAssetTypePlural(allocation.type)}
                  </Text>
                </XStack>
                <XStack alignItems="center" gap={8}>
                  <Text color={colors.textSecondary} fontSize={14}>
                    {formatCurrency(allocation.value, currency)}
                  </Text>
                  <Text color={colors.text} fontSize={14} fontWeight="500" minWidth={80} textAlign="right">
                    {formatPercent(allocation.percentage, { showSign: false, minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </Text>
                </XStack>
              </XStack>
            ))
          : sortedTagAllocations.map((allocation) => (
              <XStack
                key={allocation.tag}
                justifyContent="space-between"
                alignItems="center"
              >
                <XStack alignItems="center" gap={8}>
                  <YStack
                    width={12}
                    height={12}
                    borderRadius={3}
                    backgroundColor={allocation.color}
                  />
                  <Text color={colors.text} fontSize={14}>
                    {allocation.tag}
                  </Text>
                </XStack>
                <XStack alignItems="center" gap={8}>
                  <Text color={colors.textSecondary} fontSize={14}>
                    {formatCurrency(allocation.value, currency)}
                  </Text>
                  <Text color={colors.text} fontSize={14} fontWeight="500" minWidth={80} textAlign="right">
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

// Color palette for tags (uses asset type colors + additional colors)
const TAG_COLORS = [
  '#007AFF', // Blue (Stock)
  '#5856D6', // Purple (ETF)
  '#FF9500', // Orange (Crypto)
  '#34C759', // Green (Bond)
  '#FFCC00', // Yellow (Commodity)
  '#00D4AA', // Teal (Forex)
  '#AF52DE', // Magenta (Other)
  '#FF3B30', // Red
  '#30B0C7', // Cyan
  '#FF2D55', // Pink
  '#64D2FF', // Light Blue
  '#BF5AF2', // Violet
  '#FFD60A', // Bright Yellow
  '#32D74B', // Bright Green
  '#FF6961', // Coral
  '#77DD77', // Pastel Green
];

// Helper function to calculate tag allocations
export function calculateTagAllocations(
  assetStats: Map<string, { tags: string[]; currentValue: number | null }>
): { tagAllocations: TagAllocationData[]; totalValue: number; hasAnyTags: boolean } {
  const valuesByTag = new Map<string, number>();
  let totalValue = 0;
  let hasAnyTags = false;

  for (const [, stats] of assetStats) {
    if (stats.currentValue !== null && stats.currentValue > 0) {
      totalValue += stats.currentValue;

      if (stats.tags && stats.tags.length > 0) {
        hasAnyTags = true;
        // Distribute the value equally among all tags for this asset
        const valuePerTag = stats.currentValue / stats.tags.length;
        for (const tag of stats.tags) {
          const currentTagValue = valuesByTag.get(tag) || 0;
          valuesByTag.set(tag, currentTagValue + valuePerTag);
        }
      } else {
        // Assets without tags go to "Untagged"
        const untaggedValue = valuesByTag.get('Untagged') || 0;
        valuesByTag.set('Untagged', untaggedValue + stats.currentValue);
      }
    }
  }

  const tagAllocations: TagAllocationData[] = [];
  let colorIndex = 0;

  // Sort tags alphabetically, but put "Untagged" last
  const sortedTags = Array.from(valuesByTag.keys()).sort((a, b) => {
    if (a === 'Untagged') return 1;
    if (b === 'Untagged') return -1;
    return a.localeCompare(b);
  });

  for (const tag of sortedTags) {
    const value = valuesByTag.get(tag)!;
    tagAllocations.push({
      tag,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
      color: tag === 'Untagged' ? '#636366' : TAG_COLORS[colorIndex % TAG_COLORS.length],
    });
    if (tag !== 'Untagged') {
      colorIndex++;
    }
  }

  return { tagAllocations, totalValue, hasAnyTags };
}
