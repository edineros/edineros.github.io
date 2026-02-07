import { useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store';
import { usePortfolios } from '../lib/hooks/usePortfolios';
import { Page } from '../components/Page';
import { CONTENT_HORIZONTAL_PADDING } from '../lib/constants/layout';
import { LongButton } from '../components/LongButton';
import { useColors } from '../lib/theme/store';

const NEW_PORTFOLIO_URL = '/portfolio/create';

function MenuButton() {
  const router = useRouter();
  const colors = useColors();

  return (
    <TouchableOpacity
      onPress={() => router.push('/settings')}
      style={{ paddingHorizontal: 8, paddingVertical: 8 }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="menu" size={24} color={colors.text} />
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { getLastPortfolioId } = useAppStore();
  const { data: portfolios, isLoading } = usePortfolios();

  // Redirect to last opened portfolio (or first) when loading completes
  useEffect(() => {
    const redirect = async () => {
      if (!isLoading && portfolios && portfolios.length > 0) {
        // Try to get the last opened portfolio
        const lastId = await getLastPortfolioId();
        const targetPortfolio = lastId
          ? portfolios.find(p => p.id === lastId)
          : null;

        // Use last opened portfolio if it exists, otherwise use first
        const portfolioId = targetPortfolio?.id || portfolios[0].id;
        router.replace(`/portfolio/${portfolioId}`);
      }
    };
    redirect();
  }, [isLoading, portfolios, router, getLastPortfolioId]);

  // Show loading state
  if (isLoading || !portfolios || portfolios.length > 0) {
    return (
      <Page title="Portfolios" showBack={false} leftComponent={<MenuButton />}>
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color={colors.text} />
        </YStack>
      </Page>
    );
  }

  // Empty state - no portfolios yet
  return (
    <Page title="Portfolios" showBack={false} leftComponent={<MenuButton />}>
      <YStack flex={1} padding={32} alignItems="center" justifyContent="center">
        <Text color={colors.text} fontSize={20} fontWeight="600" textAlign="center">
          No portfolios yet
        </Text>
        <Text color={colors.textSecondary} fontSize={15} textAlign="center" marginTop={8}>
          Create your first portfolio to start tracking
        </Text>
      </YStack>

      <YStack position="absolute" bottom={40} left={CONTENT_HORIZONTAL_PADDING} right={CONTENT_HORIZONTAL_PADDING}>
        <LongButton onPress={() => router.push(NEW_PORTFOLIO_URL)}>
          Create Portfolio
        </LongButton>
      </YStack>
    </Page>
  );
}
