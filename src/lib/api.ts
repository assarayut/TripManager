import { supabase } from './supabase';
import type { Category, Expense, PoolTransaction, Profile, Trip } from '../types';

// ---------------------------------------------------------------------------
// Account management
// ---------------------------------------------------------------------------

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/**
 * Change the display name shown across the app. This updates only profiles.display_name;
 * the login username stays fixed because it's bound to a synthetic auth email that
 * Supabase won't let us re-point to another fake address.
 */
export async function updateDisplayName(newName: string): Promise<void> {
  const clean = newName.trim();
  if (!clean) throw new Error('กรอกชื่อใหม่ก่อนนะ');

  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('ยังไม่ได้เข้าสู่ระบบ');

  const { error } = await supabase.from('profiles').update({ display_name: clean }).eq('id', uid);
  if (error) throw error;
}

export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  await supabase.auth.signOut();
}

function randomInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export async function fetchProfiles(ids: string[]): Promise<Profile[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('profiles').select('*').in('id', ids);
  if (error) throw error;
  return (data ?? []).map((p) => ({ id: p.id, displayName: p.display_name, hue: p.hue }));
}

export async function fetchAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('display_name');
  if (error) throw error;
  return (data ?? []).map((p) => ({ id: p.id, displayName: p.display_name, hue: p.hue }));
}

// ---------------------------------------------------------------------------
// Trips
// ---------------------------------------------------------------------------

type TripRow = {
  id: string;
  name: string;
  emoji: string;
  budget: number;
  start_date: string | null;
  end_date: string | null;
  money_mode: 'equal' | 'pool';
  invite_code: string;
  created_by: string;
  trip_members: { profile_id: string }[];
  trip_category_budgets: { category_id: string; budget: number }[];
};

function mapTrip(row: TripRow): Trip {
  const categoryBudgets: Record<string, number> = {};
  (row.trip_category_budgets ?? []).forEach((b) => {
    categoryBudgets[b.category_id] = b.budget;
  });
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    budget: row.budget,
    startDate: row.start_date,
    endDate: row.end_date,
    moneyMode: row.money_mode,
    inviteCode: row.invite_code,
    createdBy: row.created_by,
    memberIds: (row.trip_members ?? []).map((m) => m.profile_id),
    categoryBudgets,
  };
}

const TRIP_SELECT = '*, trip_members(profile_id), trip_category_budgets(category_id, budget)';

export async function fetchTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select(TRIP_SELECT)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapTrip(row as unknown as TripRow));
}

export async function fetchTrip(tripId: string): Promise<Trip | null> {
  const { data, error } = await supabase.from('trips').select(TRIP_SELECT).eq('id', tripId).maybeSingle();
  if (error) throw error;
  return data ? mapTrip(data as unknown as TripRow) : null;
}

export interface CreateTripInput {
  name: string;
  budget: number;
  startDate: string | null;
  endDate: string | null;
  moneyMode: 'equal' | 'pool';
  memberIds: string[];
  categoryBudgets: Record<string, number>;
}

export async function createTrip(input: CreateTripInput, createdBy: string): Promise<Trip> {
  // Generate the id client-side and insert without a select-back. The trips SELECT
  // policy requires trip membership, but the creator only becomes a member on the next
  // insert — a `.select()` here would be filtered out and PostgREST reports it as an
  // RLS violation (42501). We fetch the full trip once membership exists.
  const tripId = crypto.randomUUID();
  const { error } = await supabase.from('trips').insert({
    id: tripId,
    name: input.name,
    budget: input.budget,
    start_date: input.startDate,
    end_date: input.endDate,
    money_mode: input.moneyMode,
    invite_code: randomInviteCode(),
    created_by: createdBy,
  });
  if (error) throw error;

  // The creator's own membership must land first: its RLS check passes via
  // `profile_id = auth.uid()`. Any other pre-added members pass via `is_trip_member`,
  // which is only true once the creator's row is committed.
  const { error: creatorError } = await supabase
    .from('trip_members')
    .insert({ trip_id: tripId, profile_id: createdBy });
  if (creatorError) throw creatorError;

  const otherMemberIds = input.memberIds.filter((id) => id !== createdBy);
  if (otherMemberIds.length > 0) {
    const { error: memberError } = await supabase
      .from('trip_members')
      .insert(otherMemberIds.map((profileId) => ({ trip_id: tripId, profile_id: profileId })));
    if (memberError) throw memberError;
  }

  const budgetEntries = Object.entries(input.categoryBudgets).filter(([, v]) => v > 0);
  if (budgetEntries.length > 0) {
    const { error: budgetError } = await supabase.from('trip_category_budgets').insert(
      budgetEntries.map(([categoryId, budget]) => ({ trip_id: tripId, category_id: categoryId, budget }))
    );
    if (budgetError) throw budgetError;
  }

  const trip = await fetchTrip(tripId);
  if (!trip) throw new Error('trip disappeared right after creation');
  return trip;
}

export async function deleteTrip(tripId: string): Promise<void> {
  // Rows in trip_members / expenses / splits / budgets / pool_transactions cascade
  // via their `on delete cascade` foreign keys. Only the creator may delete
  // (enforced by RLS), so a member can't nuke someone else's trip.
  //
  // `.select()` lets us tell a real delete from an RLS-blocked no-op: without the
  // delete policy from migration 0002, PostgREST returns success but deletes zero
  // rows, which would otherwise look like a successful delete.
  const { data, error } = await supabase.from('trips').delete().eq('id', tripId).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('ลบทริปไม่ได้ — ต้องรัน migration 0002 เพื่อเปิดสิทธิ์ลบก่อน (หรือคุณไม่ใช่ผู้สร้างทริปนี้)');
  }
}

export async function joinTripByInviteCode(inviteCode: string): Promise<Trip> {
  // A non-member can't SELECT a trip to look up its id (trips SELECT is member-only),
  // so joining goes through a security-definer RPC that resolves the code and inserts
  // the caller (auth.uid()) as a member atomically, then returns the trip id.
  const { data: tripId, error } = await supabase.rpc('join_trip_by_code', {
    p_code: inviteCode.trim().toUpperCase(),
  });
  if (error) throw new Error(error.message || 'เข้าร่วมทริปไม่สำเร็จ');
  if (!tripId) throw new Error('ไม่พบทริปที่ใช้รหัสนี้');

  const trip = await fetchTrip(tripId as string);
  if (!trip) throw new Error('trip disappeared right after joining');
  return trip;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

type CategoryRow = { id: string; label: string; icon: string; hue: number; is_custom: boolean };

export async function fetchCategories(tripId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .or(`trip_id.is.null,trip_id.eq.${tripId}`);
  if (error) throw error;
  return (data ?? []).map((c: CategoryRow) => ({
    id: c.id,
    label: c.label,
    icon: c.icon,
    hue: c.hue,
    isCustom: c.is_custom,
  }));
}

export async function addCustomCategory(tripId: string, label: string, hue: number, createdBy: string): Promise<Category> {
  const id = 'cat_' + crypto.randomUUID();
  const { data, error } = await supabase
    .from('categories')
    .insert({ id, trip_id: tripId, label, icon: '🏷️', hue, is_custom: true, created_by: createdBy })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, label: data.label, icon: data.icon, hue: data.hue, isCustom: true };
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

type ExpenseRow = {
  id: string;
  trip_id: string;
  category_id: string;
  amount: number;
  note: string;
  payer_id: string | null;
  is_pool_payment: boolean;
  slip_url: string | null;
  expense_date: string;
  expense_time: string;
  reimbursement_status: 'pending' | 'reimbursed' | null;
  created_at: string;
  expense_splits: { profile_id: string }[];
};

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    tripId: row.trip_id,
    categoryId: row.category_id,
    amount: row.amount,
    note: row.note,
    payerId: row.payer_id,
    isPoolPayment: row.is_pool_payment,
    splitIds: (row.expense_splits ?? []).map((s) => s.profile_id),
    slipUrl: row.slip_url,
    expenseDate: row.expense_date,
    expenseTime: row.expense_time,
    reimbursementStatus: row.reimbursement_status,
    createdAt: row.created_at,
  };
}

const EXPENSE_SELECT = '*, expense_splits(profile_id)';

export async function fetchExpenses(tripId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select(EXPENSE_SELECT)
    .eq('trip_id', tripId)
    .order('expense_date', { ascending: false })
    .order('expense_time', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapExpense(row as unknown as ExpenseRow));
}

export interface AddExpenseInput {
  id?: string;
  tripId: string;
  categoryId: string;
  amount: number;
  note: string;
  /** Who fronted the money. Null when isPoolPayment is true (the pool itself paid). */
  payerId: string | null;
  /** True = paid straight from the shared pool. False = a member paid out of pocket. */
  isPoolPayment: boolean;
  /** Equal-mode only: members splitting this expense. Empty for pool-mode expenses. */
  splitIds: string[];
  /** Pool-mode self-pay creates a reimbursement to track; equal-mode and pool-payments never need one. */
  needsReimbursement: boolean;
  slipUrl: string | null;
  createdBy: string;
}

/** Generate an id up front so a slip photo can be uploaded to storage before the expense row exists. */
export function generateExpenseId(): string {
  return crypto.randomUUID();
}

export async function addExpense(input: AddExpenseInput): Promise<Expense> {
  const now = new Date();

  const { data: row, error } = await supabase
    .from('expenses')
    .insert({
      id: input.id ?? generateExpenseId(),
      trip_id: input.tripId,
      category_id: input.categoryId,
      amount: input.amount,
      note: input.note || 'ไม่มีรายละเอียด',
      payer_id: input.isPoolPayment ? null : input.payerId,
      is_pool_payment: input.isPoolPayment,
      slip_url: input.slipUrl,
      expense_date: now.toISOString().slice(0, 10),
      expense_time: now.toTimeString().slice(0, 8),
      reimbursement_status: input.needsReimbursement ? 'pending' : null,
      created_by: input.createdBy,
    })
    .select()
    .single();
  if (error) throw error;

  if (!input.isPoolPayment && input.splitIds.length > 0) {
    const { error: splitError } = await supabase
      .from('expense_splits')
      .insert(input.splitIds.map((profileId) => ({ expense_id: row.id, profile_id: profileId })));
    if (splitError) throw splitError;
  }

  return mapExpense({ ...row, expense_splits: input.isPoolPayment ? [] : input.splitIds.map((profile_id) => ({ profile_id })) });
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
  if (error) throw error;
}

export async function markReimbursed(expenseId: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .update({ reimbursement_status: 'reimbursed' })
    .eq('id', expenseId);
  if (error) throw error;
}

export async function updateExpenseSlip(expenseId: string, slipUrl: string): Promise<void> {
  const { error } = await supabase.from('expenses').update({ slip_url: slipUrl }).eq('id', expenseId);
  if (error) throw error;
}

export async function uploadSlip(tripId: string, expenseId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${tripId}/${expenseId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('slips').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('slips').getPublicUrl(path);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// Pool ledger
// ---------------------------------------------------------------------------

type PoolTransactionRow = {
  id: string;
  trip_id: string;
  profile_id: string;
  amount: number;
  type: 'contribute' | 'withdraw';
  created_at: string;
};

export async function fetchPoolTransactions(tripId: string): Promise<PoolTransaction[]> {
  const { data, error } = await supabase
    .from('pool_transactions')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: PoolTransactionRow) => ({
    id: row.id,
    tripId: row.trip_id,
    profileId: row.profile_id,
    amount: row.amount,
    type: row.type,
    createdAt: row.created_at,
  }));
}

export async function addPoolTransaction(
  tripId: string,
  profileId: string,
  amount: number,
  type: 'contribute' | 'withdraw'
): Promise<void> {
  const { error } = await supabase
    .from('pool_transactions')
    .insert({ trip_id: tripId, profile_id: profileId, amount, type });
  if (error) throw error;
}
