import { useState } from 'react';
import { alert } from '../../lib/utils/confirm';
import { router } from 'expo-router';
import { YStack } from 'tamagui';
import { useAppStore } from '../../store';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Form } from '../../components/Form';
import { FormField } from '../../components/FormField';
import { LongButton } from '../../components/LongButton';
import { useColors } from '../../lib/theme/store';

export default function CreatePortfolioScreen() {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [isCreating, setIsCreating] = useState(false);
  const { createPortfolio } = useAppStore();
  const colors = useColors();

  const handleCreate = async () => {
    if (!name.trim()) {
      alert('Error', 'Please enter a portfolio name');
      return;
    }

    setIsCreating(true);
    try {
      const portfolio = await createPortfolio(name.trim(), currency);
      router.replace(`/portfolio/${portfolio.id}`);
    } catch (error) {
      alert('Error', (error as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <YStack flex={1} backgroundColor={colors.background}>
      <ScreenHeader title="New Portfolio" showBack fallbackPath="/" />
      <Form
        footer={
          <LongButton onPress={handleCreate} disabled={isCreating || !name.trim()}>
            {isCreating ? 'Creating...' : 'Create Portfolio'}
          </LongButton>
        }
      >
        <FormField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="My Portfolio"
          autoFocus
        />
        <FormField
          type="currency"
          label="Base Currency"
          value={currency}
          onChangeText={setCurrency}
          helperText="All values will be displayed in this currency"
        />
      </Form>
    </YStack>
  );
}
