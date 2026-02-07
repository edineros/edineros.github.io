import { useQuery } from '@tanstack/react-query';
import { getLotsForAsset } from '../db/transactions';
import { queryKeys } from './config/queryKeys';

export function useLots(assetId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.lots.byAsset(assetId ?? ''),
    queryFn: () => (assetId ? getLotsForAsset(assetId) : []),
    enabled: !!assetId,
  });
}
