import type { Category, Expense, Profile } from '../types';
import { formatMoney, formatThaiDateShort, formatTimeShort } from './money';

export interface EnrichedExpense extends Expense {
  categoryLabel: string;
  categoryIcon: string;
  categoryHue: number;
  payerName: string;
  amountFmt: string;
  dateShort: string;
  timeShort: string;
  splitNames: string;
  showSplitNames: boolean;
  showReimburseBadge: boolean;
  reimburseLabel: string;
  reimburseBg: string;
  reimburseColor: string;
}

export function enrichExpense(expense: Expense, categories: Category[], members: Profile[]): EnrichedExpense {
  const cat = categories.find((c) => c.id === expense.categoryId);
  const payerName = expense.isPoolPayment
    ? 'เงินกองกลาง'
    : members.find((m) => m.id === expense.payerId)?.displayName ?? '?';
  const splitNames = expense.splitIds
    .map((id) => members.find((m) => m.id === id)?.displayName)
    .filter(Boolean)
    .join(', ');
  const isReimbursed = expense.reimbursementStatus === 'reimbursed';

  return {
    ...expense,
    categoryLabel: cat?.label ?? '',
    categoryIcon: cat?.icon ?? '💰',
    categoryHue: cat?.hue ?? 235,
    payerName,
    amountFmt: formatMoney(expense.amount),
    dateShort: formatThaiDateShort(expense.expenseDate),
    timeShort: formatTimeShort(expense.expenseTime),
    splitNames,
    showSplitNames: expense.splitIds.length > 0,
    showReimburseBadge: !!expense.reimbursementStatus,
    reimburseLabel: isReimbursed ? '✓ คืนเงินแล้ว' : '⏳ รอคืนเงิน',
    reimburseBg: isReimbursed ? 'oklch(0.93 0.05 178)' : 'oklch(0.95 0.05 60)',
    reimburseColor: isReimbursed ? 'oklch(0.45 0.1 178)' : 'oklch(0.45 0.1 60)',
  };
}
