import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useTrip,
  useTripMembers,
  useExpenses,
  usePoolTransactions,
  useAddPoolTransaction,
  useMarkReimbursed,
  useCategories,
} from '../hooks/useTripData';
import { BottomNav } from '../components/BottomNav';
import { useToast } from '../hooks/useToast';
import { getBalances, getSettlements } from '../utils/settlement';
import { formatMoney } from '../utils/money';
import { enrichExpense } from '../utils/expenseView';
import styles from './MoneyScreen.module.css';

export function MoneyScreen() {
  const { tripId } = useParams();
  const { showToast } = useToast();
  const { data: trip } = useTrip(tripId);
  const { data: members = [] } = useTripMembers(trip?.memberIds);
  const { data: categories = [] } = useCategories(tripId);
  const { data: expenses = [] } = useExpenses(tripId);
  const { data: poolTransactions = [] } = usePoolTransactions(tripId);
  const addPoolTransaction = useAddPoolTransaction(tripId);
  const markReimbursed = useMarkReimbursed(tripId);

  const [inputs, setInputs] = useState<Record<string, string>>({});

  const isPoolMode = trip?.moneyMode === 'pool';

  const balances = useMemo(() => (trip && !isPoolMode ? getBalances(trip, expenses, members) : []), [trip, isPoolMode, expenses, members]);
  const maxAbsNet = Math.max(1, ...balances.map((b) => Math.abs(b.net)));
  const settlements = useMemo(() => (trip && !isPoolMode ? getSettlements(balances) : []), [trip, isPoolMode, balances]);

  const contributedByMember = useMemo(() => {
    const map: Record<string, number> = {};
    poolTransactions.forEach((t) => {
      map[t.profileId] = (map[t.profileId] || 0) + (t.type === 'contribute' ? t.amount : -t.amount);
    });
    return map;
  }, [poolTransactions]);

  const totalContributed = Object.values(contributedByMember).reduce((a, v) => a + v, 0);
  const spentFromPool = expenses.filter((e) => e.isPoolPayment).reduce((a, e) => a + e.amount, 0);
  const reimbursedFromPool = expenses.filter((e) => e.reimbursementStatus === 'reimbursed').reduce((a, e) => a + e.amount, 0);
  const poolBalance = totalContributed - spentFromPool - reimbursedFromPool;

  const pendingReimbursements = expenses
    .filter((e) => e.reimbursementStatus === 'pending')
    .map((e) => enrichExpense(e, categories, members));

  const handleAdd = async (memberId: string, memberName: string) => {
    const val = parseFloat(inputs[memberId]);
    if (!val || val <= 0) {
      showToast('กรอกจำนวนเงินที่จะเติมก่อนนะ');
      return;
    }
    await addPoolTransaction.mutateAsync({ profileId: memberId, amount: val, type: 'contribute' });
    setInputs((prev) => ({ ...prev, [memberId]: '' }));
    showToast(`เติมเงินกองกลางจาก${memberName}แล้ว`);
  };

  const handleWithdraw = async (memberId: string, memberName: string) => {
    const val = parseFloat(inputs[memberId]);
    if (!val || val <= 0) {
      showToast('กรอกจำนวนเงินที่จะถอนก่อนนะ');
      return;
    }
    const current = contributedByMember[memberId] || 0;
    if (val > current) {
      showToast(`ถอนได้ไม่เกินยอดที่${memberName}สมทบ (${formatMoney(current)})`);
      return;
    }
    await addPoolTransaction.mutateAsync({ profileId: memberId, amount: val, type: 'withdraw' });
    setInputs((prev) => ({ ...prev, [memberId]: '' }));
    showToast(`ถอนเงินกองกลางของ${memberName}แล้ว`);
  };

  if (!trip) return null;

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.title}>เงิน</div>
        <div className={styles.tripName}>{trip.name}</div>
        <div className={styles.modeBadge}>
          <span>{isPoolMode ? '🏦' : '⚖️'}</span>
          <span>โหมด: {isPoolMode ? 'เงินกองกลาง' : 'หารเท่ากัน'}</span>
        </div>
      </div>

      <div className={`noscroll ${styles.body}`}>
        {!isPoolMode ? (
          <>
            <div className={styles.balanceList}>
              {balances.map((b) => (
                <div key={b.id} className={styles.balanceCard}>
                  <div className={styles.balanceTop}>
                    <div className={styles.balanceMember}>
                      <div className={styles.avatar} style={{ background: `oklch(0.85 0.07 ${b.hue})` }} />
                      <span className={styles.memberName}>{b.name}</span>
                    </div>
                    <span
                      className={styles.netAmount}
                      style={{ color: b.net >= 0 ? 'oklch(0.6 0.1 178)' : 'oklch(0.62 0.12 25)' }}
                    >
                      {b.net >= 0 ? '+' : '-'}
                      {formatMoney(Math.abs(b.net))}
                    </span>
                  </div>
                  <div className={styles.paidLine}>จ่ายไปแล้ว {formatMoney(b.paid)}</div>
                  <div className={styles.balanceBarTrack}>
                    <div
                      className={styles.balanceBarFill}
                      style={{
                        width: `${Math.round((Math.abs(b.net) / maxAbsNet) * 100)}%`,
                        background: b.net >= 0 ? 'oklch(0.6 0.1 178)' : 'oklch(0.62 0.12 25)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.sectionTitle}>สรุปการโอนเงิน</div>
            {settlements.length > 0 ? (
              <div className={styles.settlementList}>
                {settlements.map((s, i) => (
                  <div key={i} className={styles.settlementRow}>
                    <span>💸</span>
                    <span className={styles.settlementText}>
                      <b>{s.from}</b> โอนให้ <b>{s.to}</b>
                    </span>
                    <span className={styles.settlementAmount}>{formatMoney(s.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>ทุกคนจ่ายเท่ากันพอดีแล้ว 🎉</div>
            )}
          </>
        ) : (
          <>
            <div className={styles.poolCard}>
              <div className={styles.poolLabel}>ยอดเงินกองกลางคงเหลือ</div>
              <div className={styles.poolBalance}>{formatMoney(poolBalance)}</div>
              <div className={styles.poolFoot}>
                <span>สมทบแล้ว {formatMoney(totalContributed)}</span>
                <span>จ่ายจากกองกลาง {formatMoney(spentFromPool)}</span>
              </div>
            </div>

            <div className={styles.sectionTitle}>เงินสมทบกองกลาง</div>
            <div className={styles.contributionList}>
              {members.map((m) => (
                <div key={m.id} className={styles.contributionCard}>
                  <div className={styles.contributionTop}>
                    <div className={styles.balanceMember}>
                      <div className={styles.avatarSm} style={{ background: `oklch(0.85 0.07 ${m.hue})` }} />
                      <span className={styles.memberNameSm}>{m.displayName}</span>
                    </div>
                    <span className={styles.contributedAmount}>{formatMoney(contributedByMember[m.id] || 0)}</span>
                  </div>
                  <div className={styles.contributionActions}>
                    <input
                      className={styles.contributionInput}
                      value={inputs[m.id] || ''}
                      onChange={(e) => setInputs((prev) => ({ ...prev, [m.id]: e.target.value }))}
                      placeholder="จำนวนเงิน"
                    />
                    <div className={styles.addButton} onClick={() => handleAdd(m.id, m.displayName)}>
                      ＋ เติม
                    </div>
                    <div className={styles.withdrawButton} onClick={() => handleWithdraw(m.id, m.displayName)}>
                      － ถอน
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.sectionTitle}>รายการรอคืนเงิน</div>
            {pendingReimbursements.length > 0 ? (
              <div className={styles.pendingList}>
                {pendingReimbursements.map((e) => (
                  <div key={e.id} className={styles.pendingCard}>
                    <div className={styles.pendingTop}>
                      <span className={styles.pendingPayer}>{e.payerName} จ่ายไปก่อน</span>
                      <span className={styles.pendingAmount}>{e.amountFmt}</span>
                    </div>
                    <div className={styles.pendingMeta}>
                      {e.note} · {e.categoryLabel}
                    </div>
                    <div className={styles.reimburseButton} onClick={() => markReimbursed.mutate(e.id)}>
                      คืนเงินจากกองกลางแล้ว
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyStateSm}>ไม่มีรายการรอคืนเงิน 🎉</div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
