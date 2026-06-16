import { useQuery } from '@tanstack/react-query';
import { fetchLanguages } from '../lib/api';

export function useLanguages() {
  return useQuery({
    queryKey: ['languages'],
    queryFn: fetchLanguages,
    staleTime: 30 * 60 * 1000,
  });
}
