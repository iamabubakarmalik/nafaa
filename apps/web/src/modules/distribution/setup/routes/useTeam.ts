/** Staff logins, for picking a route's booker and delivery man. */

import { useQuery } from '@tanstack/react-query';
import { teamApi } from '@modules/organization/team/api/team.api';

export function useTeam() {
  return useQuery({ queryKey: ['team'], queryFn: () => teamApi.list().catch(() => []), staleTime: 5 * 60_000 });
}
