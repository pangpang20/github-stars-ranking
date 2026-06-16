import { useQuery } from '@tanstack/react-query';
import { fetchRepo } from '../lib/api';

export function useRepo(owner: string, name: string, days?: number) {
  return useQuery({
    queryKey: ['repo', owner, name, days],
    queryFn: () => fetchRepo(owner, name, days),
    staleTime: 5 * 60 * 1000,
    enabled: !!owner && !!name,
  });
}
