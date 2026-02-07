import { useEffect, useState } from 'react';
import { Text, type TextProps } from 'tamagui';

interface AnimatedEllipsisProps extends Omit<TextProps, 'children'> {
  interval?: number;
}

export function AnimatedEllipsis({ interval = 400, ...textProps }: AnimatedEllipsisProps) {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setDots((prev) => (prev >= 3 ? 1 : prev + 1));
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);

  return (
    <Text {...textProps}>
      {'.'.repeat(dots)}
    </Text>
  );
}
