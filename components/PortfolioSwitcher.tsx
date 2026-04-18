import { useState, useMemo } from 'react';
import { Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { YStack, XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import type { Portfolio } from '../lib/types';
import { useColors } from '../lib/theme/store';
import { ALL_PORTFOLIOS_ID, useAppStore } from '../store';

interface DropdownItemProps {
  title: string;
  subtitle: string;
  isSelected: boolean;
  onPress: () => void;
}

function DropdownItem({ title, subtitle, isSelected, onPress }: DropdownItemProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: colors.modalBorder,
        backgroundColor: isSelected ? colors.modalBorder : 'transparent',
      }}
    >
      <YStack flex={1}>
        <Text
          color={colors.text}
          fontSize={17}
          fontWeight={isSelected ? '600' : '400'}
        >
          {title}
        </Text>
        <Text color={colors.textSecondary} fontSize={13}>
          {subtitle}
        </Text>
      </YStack>
      {isSelected && (
        <Ionicons name="checkmark" size={22} color={colors.accent} />
      )}
    </TouchableOpacity>
  );
}

interface PortfolioSwitcherProps {
  currentPortfolio: Portfolio | null; // null when "All Portfolios" is selected
  portfolios: Portfolio[];
  isAllPortfolios?: boolean;
}

export function PortfolioSwitcher({ currentPortfolio, portfolios, isAllPortfolios = false }: PortfolioSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  // pendingSelection: null = all portfolios, array = specific subset being edited in modal
  const [pendingSelection, setPendingSelection] = useState<string[] | null>(null);
  const colors = useColors();
  const { selectedPortfolioIds, setSelectedPortfolioIds } = useAppStore();

  const handleOpen = () => {
    // Initialise the in-modal selection from the current committed state
    if (!isAllPortfolios && currentPortfolio) {
      setPendingSelection([currentPortfolio.id]);
    } else {
      // On the "all" route: use the persisted selection (null = truly all)
      setPendingSelection(selectedPortfolioIds);
    }
    setIsOpen(true);
  };

  const handleTogglePortfolio = (portfolioId: string) => {
    if (pendingSelection === null) {
      // Currently in "all selected" mode – select only the clicked portfolio
      setPendingSelection([portfolioId]);
    } else if (pendingSelection.includes(portfolioId)) {
      // Deselect this portfolio
      const next = pendingSelection.filter((id) => id !== portfolioId);
      // If that would leave nothing selected, revert to "all"
      setPendingSelection(next.length === 0 ? null : next);
    } else {
      // Add this portfolio to the selection
      setPendingSelection([...pendingSelection, portfolioId]);
    }
  };

  const handleSelectAll = () => {
    setPendingSelection(null); // null means "All Portfolios"
  };

  const handleDone = () => {
    setIsOpen(false);

    if (pendingSelection === null) {
      // All portfolios
      setSelectedPortfolioIds(null);
      if (!isAllPortfolios) {
        router.replace(`/portfolio/${ALL_PORTFOLIOS_ID}`);
      }
      return;
    }

    if (pendingSelection.length === 1) {
      // Single portfolio → navigate to its own route and persist as [id]
      const targetId = pendingSelection[0];
      setSelectedPortfolioIds([targetId]);
      const currentId = isAllPortfolios ? null : currentPortfolio?.id;
      if (targetId !== currentId) {
        router.replace(`/portfolio/${targetId}`);
      }
      return;
    }

    // Multiple (but not necessarily all) portfolios selected
    const allSelected = portfolios.every((p) => pendingSelection.includes(p.id));
    if (allSelected) {
      setSelectedPortfolioIds(null);
      if (!isAllPortfolios) {
        router.replace(`/portfolio/${ALL_PORTFOLIOS_ID}`);
      }
    } else {
      setSelectedPortfolioIds(pendingSelection);
      if (!isAllPortfolios) {
        router.replace(`/portfolio/${ALL_PORTFOLIOS_ID}`);
      }
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    // discard pendingSelection – do not commit any changes
  };

  // ── Display name shown in the header trigger ──────────────────────────────
  const displayName = useMemo(() => {
    if (!isAllPortfolios) {
      return currentPortfolio?.name ?? '';
    }
    if (selectedPortfolioIds === null) {
      return 'All Portfolios';
    }
    if (selectedPortfolioIds.length === 1) {
      return portfolios.find((p) => p.id === selectedPortfolioIds[0])?.name ?? 'All Portfolios';
    }
    return `Portfolios (${selectedPortfolioIds.length})`;
  }, [isAllPortfolios, currentPortfolio, selectedPortfolioIds, portfolios]);

  // ── Selection helpers for the modal list ─────────────────────────────────
  const isAllPending = pendingSelection === null;
  const isPortfolioPending = (portfolioId: string) =>
    pendingSelection !== null && pendingSelection.includes(portfolioId);

  const showAllOption = portfolios.length > 1;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleOpen}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
      >
        <Text color={colors.text} fontSize={17} fontWeight="600">
          {displayName}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: colors.overlay }}
          onPress={handleCancel}
        >
          <YStack
            flex={1}
            justifyContent="flex-end"
            paddingHorizontal={16}
            paddingBottom={Platform.OS === 'web' ? 40 : 34}
          >
            <TouchableOpacity onPress={(e) => e.stopPropagation()}>
              <YStack
                backgroundColor={colors.modalBackground}
                borderRadius={14}
                overflow="hidden"
                maxHeight={400}
              >
                {/* Modal header */}
                <YStack padding={16} borderBottomWidth={1} borderBottomColor={colors.modalBorder}>
                  <Text color={colors.text} fontSize={17} fontWeight="600" textAlign="center">
                    Select Portfolios
                  </Text>
                </YStack>

                <ScrollView style={{ maxHeight: 300 }}>
                  {showAllOption && (
                    <DropdownItem
                      title="All Portfolios"
                      subtitle={`${portfolios.length} portfolios`}
                      isSelected={isAllPending}
                      onPress={handleSelectAll}
                    />
                  )}
                  {portfolios.map((portfolio) => (
                    <DropdownItem
                      key={portfolio.id}
                      title={portfolio.name}
                      subtitle={portfolio.currency}
                      isSelected={isPortfolioPending(portfolio.id)}
                      onPress={() => handleTogglePortfolio(portfolio.id)}
                    />
                  ))}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      setIsOpen(false);
                      router.push('/portfolio/create');
                    }}
                    style={{
                      padding: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
                    <Text color={colors.accent} fontSize={17} fontWeight="500">
                      New Portfolio
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </YStack>

              {/* Done / Cancel buttons */}
              <XStack gap={8} marginTop={8}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleCancel}
                  style={{
                    flex: 1,
                    backgroundColor: colors.modalBackground,
                    borderRadius: 14,
                    padding: 16,
                    alignItems: 'center',
                  }}
                >
                  <Text color={colors.accent} fontSize={17} fontWeight="400">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleDone}
                  style={{
                    flex: 1,
                    backgroundColor: colors.modalBackground,
                    borderRadius: 14,
                    padding: 16,
                    alignItems: 'center',
                  }}
                >
                  <Text color={colors.accent} fontSize={17} fontWeight="600">
                    Done
                  </Text>
                </TouchableOpacity>
              </XStack>
            </TouchableOpacity>
          </YStack>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
