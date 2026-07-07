import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import { useAuth } from './useAuth';

export function useTrips() {
  return useQuery({ queryKey: ['trips'], queryFn: api.fetchTrips });
}

export function useCreateTrip() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: (input: api.CreateTripInput) => {
      if (!profile) throw new Error('not signed in');
      return api.createTrip(input, profile.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }),
  });
}

export function useDeleteTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tripId: string) => api.deleteTrip(tripId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }),
  });
}

export function useJoinTrip() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: (inviteCode: string) => {
      if (!profile) throw new Error('not signed in');
      return api.joinTripByInviteCode(inviteCode);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }),
  });
}
