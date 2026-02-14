import { Modal, TouchableOpacity, TouchableWithoutFeedback, View, Switch, StyleSheet } from 'react-native';
import { XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../lib/theme/store';
import { useAppStore } from '../store';

interface TableColumnConfigDialogProps {
  visible: boolean;
  onClose: () => void;
}

export function TableColumnConfigDialog({ visible, onClose }: TableColumnConfigDialogProps) {
  const colors = useColors();
  const { tableConfig, toggleColumnVisibility } = useAppStore();

  const nameColumn = tableConfig.columns.find((column) => column.id === 'name');
  const editableColumns = tableConfig.columns.filter((column) => column.canHide && column.id !== 'name');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <TouchableWithoutFeedback>
            <View style={[styles.dialog, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {/* Header */}
              <XStack justifyContent="space-between" alignItems="center" paddingBottom={16}>
                <Text fontSize={18} fontWeight="600" color={colors.text}>
                  Display Settings
                </Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </XStack>

              {/* Show name toggle */}
              {nameColumn && (
                <XStack
                  justifyContent="space-between"
                  alignItems="center"
                  paddingVertical={12}
                  borderBottomWidth={1}
                  borderBottomColor={colors.border}
                >
                  <Text fontSize={16} color={colors.text}>
                    Show name
                  </Text>
                  <Switch
                    value={nameColumn.visible}
                    onValueChange={() => toggleColumnVisibility('name')}
                    trackColor={{ false: colors.border, true: colors.accent }}
                  />
                </XStack>
              )}

              {/* Column visibility */}
              <Text
                fontSize={13}
                fontWeight="600"
                color={colors.textSecondary}
                textTransform="uppercase"
                marginTop={16}
                marginBottom={8}
              >
                Visible Columns
              </Text>

              {editableColumns.map(column => (
                <XStack
                  key={column.id}
                  justifyContent="space-between"
                  alignItems="center"
                  paddingVertical={12}
                  borderBottomWidth={1}
                  borderBottomColor={colors.border}
                  opacity={column.canHide ? 1 : 0.5}
                >
                  <Text fontSize={16} color={colors.text}>
                    {column.label}
                  </Text>
                  <Switch
                    value={column.visible}
                    onValueChange={() => toggleColumnVisibility(column.id)}
                    trackColor={{ false: colors.border, true: colors.accent }}
                  />
                </XStack>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
});
