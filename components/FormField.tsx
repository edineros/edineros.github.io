import { ReactNode, RefObject, useMemo } from 'react';
import { TextInput, TextInputProps, KeyboardTypeOptions } from 'react-native';
import { Text, YStack } from 'tamagui';
import { Select, SelectOption } from './Select';
import { TagInput, TagInputRef } from './TagInput';
import { LabeledElement } from './LabeledElement';
import { useColors } from '../lib/theme/store';
import { CURRENCY_OPTIONS } from '../lib/utils/format';
import type { Category } from '../lib/types';

interface BaseFormFieldProps {
  label: string;
  labelRight?: ReactNode;
  helperText?: string;
  placeholder?: string;
  children?: ReactNode;
}

interface TextFormFieldProps extends BaseFormFieldProps {
  type?: 'text';
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: KeyboardTypeOptions;
  autoFocus?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  multiline?: boolean;
  numberOfLines?: number;
}

interface CurrencyFormFieldProps extends BaseFormFieldProps {
  type: 'currency';
  value: string;
  onChangeText: (text: string) => void;
}

interface TagFormFieldProps extends BaseFormFieldProps {
  type: 'tag';
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  existingTags: string[];
  tagInputRef?: RefObject<TagInputRef | null>;
}

interface CategoryFormFieldProps extends BaseFormFieldProps {
  type: 'category';
  value: string | null;
  onChangeCategory: (categoryId: string | null) => void;
  categories: Category[];
}

type FormFieldProps = TextFormFieldProps | CurrencyFormFieldProps | TagFormFieldProps | CategoryFormFieldProps;

export function FormField(props: FormFieldProps) {
  const { label, labelRight, helperText, placeholder, children, type = 'text' } = props;
  const colors = useColors();

  const currencyOptions: SelectOption<string>[] = useMemo(
    () =>
      CURRENCY_OPTIONS.map((opt) => ({
        value: opt.value,
        label: opt.value,
        sublabel: opt.label.split(' - ')[1],
      })),
    []
  );

  let input: ReactNode;

  if (type === 'currency') {
    const { value, onChangeText } = props as CurrencyFormFieldProps;
    input = (
      <Select
        value={value}
        onChange={onChangeText}
        options={currencyOptions}
        title="Select Currency"
        placeholder="Select currency"
      />
    );
  } else if (type === 'category') {
    const { value, onChangeCategory, categories } = props as CategoryFormFieldProps;
    const categoryOptions: SelectOption<string>[] = categories.map((cat) => ({
      value: cat.id,
      label: cat.name,
      icon: (
        <YStack
          width={16}
          height={16}
          borderRadius={4}
          backgroundColor={cat.color}
        />
      ),
    }));
    input = (
      <Select
        value={value}
        onChange={onChangeCategory}
        options={categoryOptions}
        title="Select Category"
        placeholder={placeholder || 'Select category'}
        allowNull
        nullLabel="None"
      />
    );
  } else if (type === 'tag') {
    const { tags, onTagsChange, existingTags, tagInputRef } = props as TagFormFieldProps;
    input = (
      <TagInput
        ref={tagInputRef}
        tags={tags}
        onChange={onTagsChange}
        existingTags={existingTags}
        placeholder={placeholder}
      />
    );
  } else {
    const { value, onChangeText, keyboardType, autoFocus, autoCapitalize, multiline, numberOfLines } =
      props as TextFormFieldProps;
    input = (
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        autoCapitalize={autoCapitalize}
        // Disable the autocomplete because it causes keyboard/layout jumps when moving between inputs
        autoComplete="off"
        autoCorrect={false}
        spellCheck={false}
        multiline={multiline}
        numberOfLines={numberOfLines}
        style={{
          backgroundColor: colors.inputBackground,
          borderRadius: 12,
          padding: 16,
          fontSize: 17,
          color: colors.text,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          ...(multiline && { minHeight: 80, textAlignVertical: 'top' }),
        }}
      />
    );
  }

  return (
    <LabeledElement label={label} labelRight={labelRight}>
      {input}
      {children}
      {helperText && (
        <Text color={colors.textTertiary} fontSize={13}>
          {helperText}
        </Text>
      )}
    </LabeledElement>
  );
}
