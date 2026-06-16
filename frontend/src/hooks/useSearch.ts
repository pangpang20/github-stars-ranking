import { useQuery } from '@tanstack/react-query';
import { fetchSearch } from '../lib/api';

export function useSearch(q: string, language?: string, page?: number) {
  return useQuery({
    queryKey: ['search', q, language, page],
    queryFn: () => fetchSearch({ q, language, page }),
    staleTime: 2 * 60 * 1000,
    enabled: q.trim().length > 0,
  });
}
