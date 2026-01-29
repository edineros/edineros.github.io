import { useState } from 'react';
import { Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { YStack, XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import type { Portfolio } from '../lib/types';

interface PortfolioSwitcherProps {
  currentPortfolio: Portfolio;
  portfolios: Portfolio[];
}

export function PortfolioSwitcher({ currentPortfolio, portfolios }: PortfolioSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (portfolio: Portfolio) => {
    setIsOpen(false);
    if (portfolio.id !== currentPortfolio.id) {
      router.replace(`/portfolio/${portfolio.id}`);
    }
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setIsOpen(true)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
      >
        <Text color="#FFFFFF" fontSize={17} fontWeight="600">
          {currentPortfolio.name}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#8E8E93" />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
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
                backgroundColor="#1C1C1E"
                borderRadius={14}
                overflow="hidden"
                maxHeight={400}
              >
                <YStack padding={16} borderBottomWidth={1} borderBottomColor="#2C2C2E">
                  <Text color="#FFFFFF" fontSize={17} fontWeight="600" textAlign="center">
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
                        borderBottomWidth: index < portfolios.length - 1 ? 1 : 0,
                        borderBottomColor: '#2C2C2E',
                        backgroundColor: portfolio.id === currentPortfolio.id ? '#2C2C2E' : 'transparent',
                      }}
                    >
                      <YStack flex={1}>
                        <Text
                          color="#FFFFFF"
                          fontSize={17}
                          fontWeight={portfolio.id === currentPortfolio.id ? '600' : '400'}
                        >
                          {portfolio.name}
                        </Text>
                        <Text color="#8E8E93" fontSize={13}>
                          {portfolio.currency}
                        </Text>
                      </YStack>
                      {portfolio.id === currentPortfolio.id && (
                        <Ionicons name="checkmark" size={22} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </YStack>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsOpen(false)}
                style={{
                  backgroundColor: '#1C1C1E',
                  borderRadius: 14,
                  marginTop: 8,
                  padding: 16,
                  alignItems: 'center',
                }}
              >
                <Text color="#007AFF" fontSize={17} fontWeight="600">
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
