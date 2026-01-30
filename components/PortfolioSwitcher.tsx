import { useState } from 'react';
import { Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { YStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import type { Portfolio } from '../lib/types';
import { useColors } from '../lib/theme/store';

interface PortfolioSwitcherProps {
  currentPortfolio: Portfolio;
  portfolios: Portfolio[];
}

export function PortfolioSwitcher({ currentPortfolio, portfolios }: PortfolioSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const colors = useColors();

  const handleSelect = (portfolio: Portfolio) => {
    setIsOpen(false);
    if (portfolio.id !== currentPortfolio.id) {
      router.replace(`/portfolio/${portfolio.id}`);
    }
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    router.push('/portfolio/create');
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setIsOpen(true)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
      >
        <Text color={colors.text} fontSize={17} fontWeight="600">
          {currentPortfolio.name}
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
                  {portfolios.map((portfolio, index) => (
                    <TouchableOpacity
                      key={portfolio.id}
                      activeOpacity={0.7}
                      onPress={() => handleSelect(portfolio)}
                      style={{
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottomWidth: 1,
                        borderBottomColor: colors.modalBorder,
                        backgroundColor: portfolio.id === currentPortfolio.id ? colors.modalBorder : 'transparent',
                      }}
                    >
                      <YStack flex={1}>
                        <Text
                          color={colors.text}
                          fontSize={17}
                          fontWeight={portfolio.id === currentPortfolio.id ? '600' : '400'}
                        >
                          {portfolio.name}
                        </Text>
                        <Text color={colors.textSecondary} fontSize={13}>
                          {portfolio.currency}
                        </Text>
                      </YStack>
                      {portfolio.id === currentPortfolio.id && (
                        <Ionicons name="checkmark" size={22} color={colors.accent} />
                      )}
                    </TouchableOpacity>
                  ))}
                  {/* New Portfolio option */}
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
