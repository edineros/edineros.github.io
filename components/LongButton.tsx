import { Button, ButtonProps } from 'tamagui';
import { LabeledElement } from './LabeledElement';
import { useColors } from '../lib/theme/store';
import { ReactNode } from 'react';

type LongButtonVariant = 'primary' | 'secondary' | 'destructive';
type LongButtonSize = 'small' | 'medium' | 'large';
type LongButtonTopSpacing = 'small' | 'medium' | 'large';

interface LongButtonProps {
  onPress: () => void;
  disabled?: boolean;
  variant?: LongButtonVariant;
  size?: LongButtonSize;
  topSpacing?: LongButtonTopSpacing;
  label?: string;
  children: ReactNode;
}

const SIZE_MAP: Record<LongButtonSize, ButtonProps['size']> = {
  small: '$3',
  medium: '$5',
  large: '$6',
};

const TOP_SPACING_MAP: Record<LongButtonTopSpacing, ButtonProps['marginTop']> = {
  small: '$2',
  medium: '$4',
  large: '$6',
};

export function LongButton({
  onPress,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  topSpacing,
  label,
  children,
}: LongButtonProps) {
  const colors = useColors();

  const getVariantStyles = (): Partial<ButtonProps> => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: colors.accent, borderWidth: 0 };
      case 'secondary':
        return { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, borderWidth: 1 };
      case 'destructive':
        return { backgroundColor: colors.destructive, borderWidth: 0 };
    }
  };

  const tamaguiSize = SIZE_MAP[size];
  const marginTop = topSpacing ? TOP_SPACING_MAP[topSpacing] : undefined;

  return (
    <LabeledElement label={label}>
      <Button
        size={tamaguiSize}
        onPress={onPress}
        disabled={disabled}
        color={colors.text}
        fontWeight="600"
        marginTop={marginTop}
        {...getVariantStyles()}
      >
        {children}
      </Button>
    </LabeledElement>
  );
}
