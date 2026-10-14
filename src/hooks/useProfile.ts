import { useQuery } from '@tanstack/react-query';
import { profileApi } from '@/api/profile';
import { useAuth } from '@/store/auth';

/** What we know about the customer and how much of "complete your profile" is done. Quietly empty if the server can't say. */
export function useProfile() {
  const signedIn = !!useAuth((s) => s.customer);
  const q = useQuery({ queryKey: ['profile'], queryFn: profileApi.get, enabled: signedIn, retry: false, staleTime: 60_000 });
  return { ...q, percent: q.data?.checklist.percent ?? null, items: q.data?.checklist.items ?? [], customer: q.data?.customer };
}
