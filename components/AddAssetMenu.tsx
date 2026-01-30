import { useState } from 'react';
import { TouchableOpacity, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, Text } from 'tamagui';
import { FloatingActionButton } from './FloatingActionButton';
import { ASSET_TYPE_CONFIGS } from '../lib/constants/assetTypes';
import { useColors } from '../lib/theme/store';

interface AddAssetMenuProps {
  portfolioId: string;
}

export function AddAssetMenu({ portfolioId }: AddAssetMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const colors = useColors();

  const handleSelectType = (type: string) => {
    setIsOpen(false);
    router.push(`/asset/add?portfolioId=${portfolioId}&type=${type}`);
  };

  return (
    <>
      <FloatingActionButton onPress={() => setIsOpen(true)} />

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: colors.overlay,
            justifyContent: 'flex-end',
            alignItems: 'flex-end',
            paddingBottom: 120,
            paddingRight: 24,
          }}
          onPress={() => setIsOpen(false)}
        >
          <YStack
            backgroundColor={colors.modalBackground}
            borderRadius={12}
            padding={16}
            minWidth={180}
          >
            <Text color={colors.textSecondary} fontSize={13} fontWeight="600" marginBottom={8}>
              ADD ASSET
            </Text>
            {ASSET_TYPE_CONFIGS.map((config) => (
              <TouchableOpacity
                key={config.value}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 4,
                }}
                onPress={() => handleSelectType(config.value)}
                activeOpacity={0.7}
              >
                <YStack
                  width={8}
                  height={8}
                  borderRadius={4}
                  backgroundColor={config.color}
                  marginRight={12}
                />
                <Text color={colors.text} fontSize={17}>
                  {config.label}
                </Text>
              </TouchableOpacity>
            ))}
          </YStack>
        </Pressable>
      </Modal>
    </>
  );
}
