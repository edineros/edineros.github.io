import { useState } from 'react';
import { TouchableOpacity, TextInput, Modal } from 'react-native';
import { YStack, XStack, Text, Spacer } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { alert, confirm } from '../lib/utils/confirm';
import { SettingsSection } from './SettingsSection';
import { LongButton } from './LongButton';
import { useColors } from '../lib/theme/store';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '../lib/hooks/useCategories';
import type { Category } from '../lib/types';
import { assetColors } from '../lib/theme/colors';

export function CategoriesSettings() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(assetColors[0]);
  const colors = useColors();

  const { data: categories = [] } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const openAdd = () => {
    setEditingCategory(null);
    setName('');
    setColor(assetColors[0]);
    setIsModalOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setColor(category.color);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Error', 'Please enter a category name');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({
          id: editingCategory.id,
          updates: { name: name.trim(), color },
        });
      } else {
        await createCategory.mutateAsync({
          name: name.trim(),
          color,
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      alert('Error', (error as Error).message);
    }
  };

  const handleDelete = async (category: Category) => {
    const confirmed = await confirm({
      title: 'Delete Category?',
      message: `Are you sure you want to delete "${category.name}"? Assets in this category will become uncategorized.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      destructive: true,
    });

    if (confirmed) {
      try {
        await deleteCategory.mutateAsync(category.id);
      } catch (error) {
        alert('Error', (error as Error).message);
      }
    }
  };

  const isSaving = createCategory.isPending || updateCategory.isPending;

  return (
    <>
      <SettingsSection
        title={`Categories (${categories.length})`}
        subtitle="Organize your assets into custom categories"
        collapsed
      >
        <YStack gap={4}>
          {categories.map((category) => (
            <XStack
              key={category.id}
              alignItems="center"
              justifyContent="space-between"
              padding={12}
              backgroundColor={colors.backgroundTertiary}
              borderRadius={10}
            >
              <XStack alignItems="center" gap={12}>
                <YStack
                  width={20}
                  height={20}
                  borderRadius={5}
                  backgroundColor={category.color}
                />
                <Text color={colors.text} fontSize={16}>
                  {category.name}
                </Text>
              </XStack>
              <XStack gap={16}>
                <TouchableOpacity
                  onPress={() => openEdit(category)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="pencil" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(category)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.loss} />
                </TouchableOpacity>
              </XStack>
            </XStack>
          ))}
          <Spacer />
          <LongButton onPress={openAdd}>
            Add Category
          </LongButton>
        </YStack>
      </SettingsSection>

      <Modal
        visible={isModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: colors.overlay }}
          onPress={() => setIsModalOpen(false)}
        >
          <YStack flex={1} justifyContent="center" paddingHorizontal={24}>
            <TouchableOpacity onPress={(e) => e.stopPropagation()}>
              <YStack
                backgroundColor={colors.modalBackground}
                borderRadius={14}
                overflow="hidden"
              >
                <YStack padding={16} borderBottomWidth={1} borderBottomColor={colors.modalBorder}>
                  <Text color={colors.text} fontSize={17} fontWeight="600" textAlign="center">
                    {editingCategory ? 'Edit Category' : 'Add Category'}
                  </Text>
                </YStack>

                <YStack padding={16} gap={16}>
                  <YStack gap={8}>
                    <Text color={colors.textSecondary} fontSize={13} fontWeight="600">
                      NAME
                    </Text>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Category name"
                      placeholderTextColor={colors.placeholder}
                      autoFocus
                      style={{
                        backgroundColor: colors.inputBackground,
                        borderRadius: 10,
                        padding: 12,
                        fontSize: 16,
                        color: colors.text,
                        borderWidth: 1,
                        borderColor: colors.inputBorder,
                      }}
                    />
                  </YStack>

                  <YStack gap={8}>
                    <Text color={colors.textSecondary} fontSize={13} fontWeight="600">
                      COLOR
                    </Text>
                    <XStack flexWrap="wrap" gap={8}>
                      {assetColors.map((c) => (
                        <TouchableOpacity
                          key={c}
                          onPress={() => setColor(c)}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 8,
                            backgroundColor: c,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: color === c ? 3 : 0,
                            borderColor: '#FFFFFF',
                          }}
                        >
                          {color === c && (
                            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </XStack>
                  </YStack>
                </YStack>

                <XStack borderTopWidth={1} borderTopColor={colors.modalBorder}>
                  <TouchableOpacity
                    onPress={() => setIsModalOpen(false)}
                    style={{
                      flex: 1,
                      padding: 16,
                      alignItems: 'center',
                      borderRightWidth: 1,
                      borderRightColor: colors.modalBorder,
                    }}
                  >
                    <Text color={colors.textSecondary} fontSize={17}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSave}
                    disabled={isSaving}
                    style={{
                      flex: 1,
                      padding: 16,
                      alignItems: 'center',
                    }}
                  >
                    <Text color={colors.accent} fontSize={17} fontWeight="600">
                      {isSaving ? 'Saving...' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                </XStack>
              </YStack>
            </TouchableOpacity>
          </YStack>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
