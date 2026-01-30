import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { TextInput, TouchableOpacity } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../lib/theme/store';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  existingTags: string[];
  placeholder?: string;
}

export interface TagInputRef {
  commitPending: () => string[];
}

export const TagInput = forwardRef<TagInputRef, TagInputProps>(
  function TagInput(
    { tags, onChange, existingTags, placeholder = 'Add tag...' },
    ref
  ) {
    const colors = useColors();
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);

    useEffect(() => {
      if (inputValue.length > 0) {
        const filtered = existingTags.filter(
          (tag) =>
            tag.toLowerCase().includes(inputValue.toLowerCase()) &&
            !tags.some((t) => t.toLowerCase() === tag.toLowerCase())
        );
        setSuggestions(filtered.slice(0, 5));
      } else {
        setSuggestions([]);
      }
    }, [inputValue, existingTags, tags]);

    const addTag = (tag: string) => {
      const trimmed = tag.trim();
      if (trimmed && !tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
        onChange([...tags, trimmed]);
      }
      setInputValue('');
      setSuggestions([]);
    };

    const removeTag = (tagToRemove: string) => {
      onChange(tags.filter((t) => t !== tagToRemove));
    };

    const handleSubmit = () => {
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    };

    // Expose a method to commit any pending input and return the final tags
    useImperativeHandle(ref, () => ({
      commitPending: () => {
        const trimmed = inputValue.trim();
        if (trimmed && !tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
          const newTags = [...tags, trimmed];
          onChange(newTags);
          setInputValue('');
          return newTags;
        }
        return tags;
      },
    }));

    return (
      <YStack gap={8}>
        {/* Current tags */}
        {tags.length > 0 && (
          <XStack flexWrap="wrap" gap={8}>
            {tags.map((tag) => (
              <XStack
                key={tag}
                backgroundColor={colors.border}
                paddingVertical={6}
                paddingLeft={10}
                paddingRight={6}
                borderRadius={6}
                alignItems="center"
                gap={4}
              >
                <Text color={colors.text} fontSize={14}>
                  {tag}
                </Text>
                <TouchableOpacity onPress={() => removeTag(tag)} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </XStack>
            ))}
          </XStack>
        )}

        {/* Input field */}
        <TextInput
          value={inputValue}
          onChangeText={setInputValue}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            backgroundColor: colors.inputBackground,
            borderRadius: 12,
            padding: 16,
            fontSize: 17,
            color: colors.text,
            borderWidth: 1,
            borderColor: colors.inputBorder,
          }}
        />

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <YStack
            backgroundColor={colors.inputBackground}
            borderRadius={12}
            borderWidth={1}
            borderColor={colors.inputBorder}
            overflow="hidden"
          >
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={suggestion}
                activeOpacity={0.7}
                onPress={() => addTag(suggestion)}
                style={{
                  padding: 12,
                  borderBottomWidth: index < suggestions.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Ionicons name="pricetag-outline" size={16} color={colors.textSecondary} />
                <Text color={colors.text} fontSize={15}>
                  {suggestion}
                </Text>
              </TouchableOpacity>
            ))}
          </YStack>
        )}

        {/* Show "create new tag" option if input doesn't match existing */}
        {inputValue.trim() &&
          !suggestions.some(
            (s) => s.toLowerCase() === inputValue.trim().toLowerCase()
          ) &&
          !tags.some(
            (t) => t.toLowerCase() === inputValue.trim().toLowerCase()
          ) && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleSubmit}
              style={{
                backgroundColor: colors.inputBackground,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.inputBorder,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.accent} />
              <Text color={colors.accent} fontSize={15}>
                Create "{inputValue.trim()}"
              </Text>
            </TouchableOpacity>
          )}
      </YStack>
    );
  }
);
