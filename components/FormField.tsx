import { ReactNode, RefObject } from 'react';
import { TextInput, TextInputProps, KeyboardTypeOptions } from 'react-native';
import { Text } from 'tamagui';
import { CurrencySelect } from './CurrencySelect';
import { TagInput, TagInputRef } from './TagInput';
import { LabeledElement } from './LabeledElement';

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

type FormFieldProps = TextFormFieldProps | CurrencyFormFieldProps | TagFormFieldProps;

export function FormField(props: FormFieldProps) {
  const { label, labelRight, helperText, placeholder, children, type = 'text' } = props;

  let input: ReactNode;

  if (type === 'currency') {
    const { value, onChangeText } = props as CurrencyFormFieldProps;
    input = <CurrencySelect value={value} onChange={onChangeText} />;
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
        placeholderTextColor="#636366"
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        numberOfLines={numberOfLines}
        style={{
          backgroundColor: '#111111',
          borderRadius: 12,
          padding: 16,
          fontSize: 17,
          color: '#FFFFFF',
          borderWidth: 1,
          borderColor: '#1F1F1F',
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
        <Text color="#636366" fontSize={13}>
          {helperText}
        </Text>
      )}
    </LabeledElement>
  );
}
