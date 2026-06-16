import { useQuery } from '@tanstack/react-query';
import { fetchStats } from '../lib/api';

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    staleTime: 5 * 60 * 1000,
  });
}
