import { Button, ThemeName } from 'tamagui'
import { useRouter } from 'expo-router'
import { ReactNode } from 'react'

type MicroButtonProps = {
  children: ReactNode
  href?: string
  onPress?: () => void
  theme?: ThemeName
}

export function MicroButton({
  children,
  href,
  onPress,
  theme,
}: MicroButtonProps) {
  const router = useRouter()

  return (
    <Button
      size="$2"
      variant="outlined"
      theme={theme}
      onPress={onPress ?? (href ? () => router.push(href) : undefined)}
    >
      {children}
    </Button>
  )
}
