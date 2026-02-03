import { useState } from 'react';
import { Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { YStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import type { Portfolio } from '../lib/types';
import { useColors } from '../lib/theme/store';
import { ALL_PORTFOLIOS_ID } from '../store';

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
  const colors = useColors();

  const handleSelect = (portfolio: Portfolio) => {
    setIsOpen(false);
    const currentId = isAllPortfolios ? ALL_PORTFOLIOS_ID : currentPortfolio?.id;
    if (portfolio.id !== currentId) {
      router.replace(`/portfolio/${portfolio.id}`);
    }
  };

  const handleSelectAll = () => {
    setIsOpen(false);
    if (!isAllPortfolios) {
      router.replace(`/portfolio/${ALL_PORTFOLIOS_ID}`);
    }
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    router.push('/portfolio/create');
  };

  const displayName = isAllPortfolios ? 'All Portfolios' : currentPortfolio?.name ?? '';
  const showAllOption = portfolios.length > 1;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setIsOpen(true)}
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
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: colors.overlay }}
          onPress={() => setIsOpen(false)}
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
                <YStack padding={16} borderBottomWidth={1} borderBottomColor={colors.modalBorder}>
                  <Text color={colors.text} fontSize={17} fontWeight="600" textAlign="center">
                    Switch Portfolio
                  </Text>
                </YStack>
                <ScrollView style={{ maxHeight: 300 }}>
                  {showAllOption && (
                    <DropdownItem
                      title="All Portfolios"
                      subtitle={`${portfolios.length} portfolios`}
                      isSelected={isAllPortfolios}
                      onPress={handleSelectAll}
                    />
                  )}
                  {portfolios.map((portfolio) => (
                    <DropdownItem
                      key={portfolio.id}
                      title={portfolio.name}
                      subtitle={portfolio.currency}
                      isSelected={!isAllPortfolios && portfolio.id === currentPortfolio?.id}
                      onPress={() => handleSelect(portfolio)}
                    />
                  ))}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleCreateNew}
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
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsOpen(false)}
                style={{
                  backgroundColor: colors.modalBackground,
                  borderRadius: 14,
                  marginTop: 8,
                  padding: 16,
                  alignItems: 'center',
                }}
              >
                <Text color={colors.accent} fontSize={17} fontWeight="600">
                  Cancel
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </YStack>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
