import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import { useAuth } from './useAuth';

export function useTrip(tripId: string | undefined) {
  return useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => api.fetchTrip(tripId as string),
    enabled: !!tripId,
  });
}

export function useTripMembers(memberIds: string[] | undefined) {
  return useQuery({
    queryKey: ['profiles', memberIds],
    queryFn: () => api.fetchProfiles(memberIds as string[]),
    enabled: !!memberIds && memberIds.length > 0,
  });
}

export function useAllProfiles() {
  return useQuery({ queryKey: ['profiles', 'all'], queryFn: api.fetchAllProfiles });
}

export function useCategories(tripId: string | undefined) {
  return useQuery({
    queryKey: ['categories', tripId],
    queryFn: () => api.fetchCategories(tripId as string),
    enabled: !!tripId,
  });
}

export function useAddCustomCategory(tripId: string | undefined) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: ({ label, hue }: { label: string; hue: number }) => {
      if (!tripId || !profile) throw new Error('missing trip or profile');
      return api.addCustomCategory(tripId, label, hue, profile.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', tripId] }),
  });
}

export function useExpenses(tripId: string | undefined) {
  return useQuery({
    queryKey: ['expenses', tripId],
    queryFn: () => api.fetchExpenses(tripId as string),
    enabled: !!tripId,
  });
}

export function useAddExpense(tripId: string | undefined) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: (input: Omit<api.AddExpenseInput, 'tripId' | 'createdBy'>) => {
      if (!tripId || !profile) throw new Error('missing trip or profile');
      return api.addExpense({ ...input, tripId, createdBy: profile.id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses', tripId] }),
  });
}

export function useDeleteExpense(tripId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: string) => api.deleteExpense(expenseId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses', tripId] }),
  });
}

export function useMarkReimbursed(tripId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: string) => api.markReimbursed(expenseId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses', tripId] }),
  });
}

export function useUpdateExpenseSlip(tripId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ expenseId, slipUrl }: { expenseId: string; slipUrl: string }) =>
      api.updateExpenseSlip(expenseId, slipUrl),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses', tripId] }),
  });
}

export function usePoolTransactions(tripId: string | undefined) {
  return useQuery({
    queryKey: ['poolTransactions', tripId],
    queryFn: () => api.fetchPoolTransactions(tripId as string),
    enabled: !!tripId,
  });
}

export function useAddPoolTransaction(tripId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ profileId, amount, type }: { profileId: string; amount: number; type: 'contribute' | 'withdraw' }) => {
      if (!tripId) throw new Error('missing trip');
      return api.addPoolTransaction(tripId, profileId, amount, type);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['poolTransactions', tripId] }),
  });
}
