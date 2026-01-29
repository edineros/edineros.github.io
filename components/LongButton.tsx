import { Button, ButtonProps } from 'tamagui';
import { LabeledElement } from './LabeledElement';

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
  children: string;
}

const VARIANT_STYLES: Record<LongButtonVariant, Partial<ButtonProps>> = {
  primary: {
    backgroundColor: '#007AFF',
    borderWidth: 0,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderColor: '#1F1F1F',
    borderWidth: 1,
  },
  destructive: {
    backgroundColor: '#FF3B30',
    borderWidth: 0,
  },
};

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
  const variantStyles = VARIANT_STYLES[variant];
  const tamaguiSize = SIZE_MAP[size];
  const marginTop = topSpacing ? TOP_SPACING_MAP[topSpacing] : undefined;

  return (
    <LabeledElement label={label}>
      <Button
        size={tamaguiSize}
        onPress={onPress}
        disabled={disabled}
        color="#FFFFFF"
        fontWeight="600"
        marginTop={marginTop}
        {...variantStyles}
      >
        {children}
      </Button>
    </LabeledElement>
  );
}
