import { useQuery } from '@tanstack/react-query';
import { biometricInfo } from '@/lib/biometrics';

/** What this phone can do (Face ID, fingerprint, nothing), looked up once. */
export function useBiometricInfo() {
  const q = useQuery({ queryKey: ['biometric-info'], queryFn: biometricInfo, staleTime: Infinity, gcTime: Infinity });
  return { available: !!q.data?.available, label: q.data?.label ?? 'biometrics', ready: q.isSuccess };
}
