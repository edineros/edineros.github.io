import { YStack, XStack, Text } from 'tamagui';
import { DonutChart, DonutSegment } from './DonutChart';
import type { AssetType, Category } from '../lib/types';
import { formatCurrency, formatPercent } from '../lib/utils/format';
import { getAssetTypeColor, getAssetTypePlural } from '../lib/constants/assetTypes';
import { VALUE_MASK } from '../lib/constants/ui';
import { useColors } from '../lib/theme/store';
import { uncategorizedColor } from '../lib/theme/colors';

export type AllocationMode = 'type' | 'category';

export interface AllocationData {
  type: AssetType;
  value: number;
  percentage: number;
}

export interface CategoryAllocationData {
  categoryId: string | null;
  categoryName: string;
  value: number;
  percentage: number;
  color: string;
}

interface AssetAllocationChartProps {
  allocations: AllocationData[];
  categoryAllocations?: CategoryAllocationData[];
  currency: string;
  mode: AllocationMode;
  masked?: boolean;
}

export function AssetAllocationChart({
  allocations,
  categoryAllocations = [],
  currency,
  mode,
  masked = false,
}: AssetAllocationChartProps) {
  const colors = useColors();

  // Filter out zero allocations and sort by value descending
  const sortedTypeAllocations = allocations
    .filter((a) => a.value > 0)
    .sort((a, b) => b.value - a.value);

  const sortedCategoryAllocations = categoryAllocations
    .filter((a) => a.value > 0)
    .sort((a, b) => b.value - a.value);

  const showTypeView = mode === 'type';
  const currentAllocations = showTypeView ? sortedTypeAllocations : sortedCategoryAllocations;

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
    : sortedCategoryAllocations.map((allocation) => ({
      value: allocation.value,
      color: allocation.color,
      label: allocation.categoryName,
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
                  {masked ? VALUE_MASK : formatCurrency(allocation.value, currency)}
                </Text>
                <Text color={colors.text} fontSize={14} fontWeight="500" minWidth={80} textAlign="right">
                  {formatPercent(allocation.percentage, { showSign: false, minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </Text>
              </XStack>
            </XStack>
          ))
          : sortedCategoryAllocations.map((allocation) => (
            <XStack
              key={allocation.categoryId ?? 'uncategorized'}
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
                  {allocation.categoryName}
                </Text>
              </XStack>
              <XStack alignItems="center" gap={8}>
                <Text color={colors.textSecondary} fontSize={14}>
                  {masked ? VALUE_MASK : formatCurrency(allocation.value, currency)}
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

// Helper function to calculate category allocations
export function calculateCategoryAllocations(
  assetStats: Map<string, { categoryId: string | null; currentValue: number | null }>,
  categories: Category[]
): { categoryAllocations: CategoryAllocationData[]; totalValue: number; hasAnyCategories: boolean } {
  const valuesByCategory = new Map<string | null, number>();
  let totalValue = 0;
  let hasAnyCategories = false;

  for (const [, stats] of assetStats) {
    if (stats.currentValue !== null && stats.currentValue > 0) {
      totalValue += stats.currentValue;

      if (stats.categoryId) {
        hasAnyCategories = true;
      }

      const currentCategoryValue = valuesByCategory.get(stats.categoryId) || 0;
      valuesByCategory.set(stats.categoryId, currentCategoryValue + stats.currentValue);
    }
  }

  // Create a map for quick category lookup
  const categoryMap = new Map<string, Category>();
  for (const category of categories) {
    categoryMap.set(category.id, category);
  }

  const categoryAllocations: CategoryAllocationData[] = [];

  // Sort: categorized items first (by category name), then uncategorized last
  const sortedKeys = Array.from(valuesByCategory.keys()).sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    const catA = categoryMap.get(a);
    const catB = categoryMap.get(b);
    return (catA?.name || '').localeCompare(catB?.name || '');
  });

  for (const categoryId of sortedKeys) {
    const value = valuesByCategory.get(categoryId)!;
    const category = categoryId ? categoryMap.get(categoryId) : null;

    categoryAllocations.push({
      categoryId,
      categoryName: category?.name || 'Uncategorized',
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
      color: category?.color || uncategorizedColor,
    });
  }

  return { categoryAllocations, totalValue, hasAnyCategories };
}
