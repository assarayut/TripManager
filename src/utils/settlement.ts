import type { Balance, Expense, Profile, Settlement, Trip } from '../types';

/** Paid vs. owed per trip member, derived from equal-mode expenses (pool-mode expenses have no split). */
export function getBalances(trip: Trip, expenses: Expense[], members: Profile[]): Balance[] {
  const tripExpenses = expenses.filter((e) => e.tripId === trip.id);
  const paid: Record<string, number> = {};
  const owed: Record<string, number> = {};
  trip.memberIds.forEach((id) => {
    paid[id] = 0;
    owed[id] = 0;
  });
  tripExpenses.forEach((e) => {
    if (!e.isPoolPayment && e.payerId && paid.hasOwnProperty(e.payerId)) {
      paid[e.payerId] += e.amount;
    }
    const share = e.amount / (e.splitIds.length || 1);
    e.splitIds.forEach((id) => {
      if (owed.hasOwnProperty(id)) owed[id] += share;
    });
  });
  return trip.memberIds.map((id) => {
    const m = members.find((mm) => mm.id === id) ?? { id, displayName: '?', hue: 235 };
    return {
      id,
      name: m.displayName,
      hue: m.hue,
      paid: paid[id] || 0,
      owed: owed[id] || 0,
      net: (paid[id] || 0) - (owed[id] || 0),
    };
  });
}

/** Greedy debtor/creditor matching so the fewest transfers settle everyone up. */
export function getSettlements(balances: Balance[]): Settlement[] {
  const debtors = balances
    .filter((b) => b.net < -0.5)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.net - b.net);
  const creditors = balances
    .filter((b) => b.net > 0.5)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.net - a.net);

  const result: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const amt = Math.min(-d.net, c.net);
    result.push({ from: d.name, to: c.name, amount: amt });
    d.net += amt;
    c.net -= amt;
    if (Math.abs(d.net) < 0.5) i++;
    if (Math.abs(c.net) < 0.5) j++;
  }
  return result;
}
