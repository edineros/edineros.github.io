import { useState } from 'react';
import { alert } from '../../lib/utils/confirm';
import { router } from 'expo-router';
import { useCreatePortfolio } from '../../lib/hooks/usePortfolios';
import { Page } from '../../components/Page';
import { Form } from '../../components/Form';
import { FormField } from '../../components/FormField';
import { LongButton } from '../../components/LongButton';

export default function CreatePortfolioScreen() {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const createPortfolio = useCreatePortfolio();

  const handleCreate = async () => {
    if (!name.trim()) {
      alert('Error', 'Please enter a portfolio name');
      return;
    }

    try {
      const portfolio = await createPortfolio.mutateAsync({ name: name.trim(), currency });
      router.replace(`/portfolio/${portfolio.id}`);
    } catch (error) {
      alert('Error', (error as Error).message);
    }
  };

  return (
    <Page title="New Portfolio" fallbackPath="/">
      <Form
        footer={
          <LongButton onPress={handleCreate} disabled={createPortfolio.isPending || !name.trim()}>
            {createPortfolio.isPending ? 'Creating...' : 'Create Portfolio'}
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
    </Page>
  );
}
