export type MoneyMode = 'equal' | 'pool';
export type ReimbursementStatus = 'pending' | 'reimbursed' | null;

export interface Profile {
  id: string;
  displayName: string;
  hue: number;
  isAdmin?: boolean;
}

export interface AdminAccount {
  id: string;
  username: string;
  displayName: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  hue: number;
  isCustom: boolean;
}

export interface Trip {
  id: string;
  name: string;
  emoji: string;
  budget: number;
  startDate: string | null;
  endDate: string | null;
  moneyMode: MoneyMode;
  inviteCode: string;
  createdBy: string;
  memberIds: string[];
  categoryBudgets: Record<string, number>;
}

export interface Expense {
  id: string;
  tripId: string;
  categoryId: string;
  amount: number;
  note: string;
  payerId: string | null;
  isPoolPayment: boolean;
  splitIds: string[];
  slipUrl: string | null;
  expenseDate: string;
  expenseTime: string;
  reimbursementStatus: ReimbursementStatus;
  createdAt: string;
}

export interface PoolTransaction {
  id: string;
  tripId: string;
  profileId: string;
  amount: number;
  type: 'contribute' | 'withdraw';
  createdAt: string;
}

export interface Balance {
  id: string;
  name: string;
  hue: number;
  paid: number;
  owed: number;
  net: number;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}
