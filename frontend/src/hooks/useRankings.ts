import { useQuery } from '@tanstack/react-query';
import { fetchRankings, type RankingParams } from '../lib/api';

export function useRankings(params: RankingParams) {
  return useQuery({
    queryKey: ['rankings', params],
    queryFn: () => fetchRankings(params),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}
