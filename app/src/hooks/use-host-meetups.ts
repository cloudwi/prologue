import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { getHostMeetups } from '@/lib/meetups';
import { useRefreshOnFocus, useSessionGuard } from '@/lib/query';
import { useSession } from '@/lib/session';

export function useHostMeetups() {
  const session = useSession();
  const router = useRouter();
  const query = useQuery({ queryKey: ['meetups', 'host'], queryFn: getHostMeetups, enabled: session.signedIn });
  const { refetch } = query;
  useRefreshOnFocus(useCallback(() => { if (session.signedIn) void refetch(); }, [refetch, session.signedIn]));
  useSessionGuard(query.error, useCallback(() => router.replace('/'), [router]));
  return { ...query, session };
}
