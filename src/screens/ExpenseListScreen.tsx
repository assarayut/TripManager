import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTrip, useTripMembers, useCategories, useExpenses, useDeleteExpense } from '../hooks/useTripData';
import { BottomNav } from '../components/BottomNav';
import { Chip } from '../components/Chip';
import { ExpenseRow } from '../components/ExpenseRow';
import { ExpenseDetailModal } from '../components/ExpenseDetailModal';
import { useToast } from '../hooks/useToast';
import { formatMoney } from '../utils/money';
import { enrichExpense } from '../utils/expenseView';
import styles from './ExpenseListScreen.module.css';

export function ExpenseListScreen() {
  const { tripId } = useParams();
  const { showToast } = useToast();
  const { data: trip } = useTrip(tripId);
  const { data: members = [] } = useTripMembers(trip?.memberIds);
  const { data: categories = [] } = useCategories(tripId);
  const { data: expenses = [] } = useExpenses(tripId);
  const deleteExpense = useDeleteExpense(tripId);

  const [filter, setFilter] = useState('all');
  const [detailId, setDetailId] = useState<string | null>(null);

  const enriched = useMemo(
    () =>
      [...expenses]
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .map((e) => enrichExpense(e, categories, members)),
    [expenses, categories, members]
  );

  const filtered = filter === 'all' ? enriched : enriched.filter((e) => e.categoryId === filter);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((e) => {
      const key = e.dateShort;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return Array.from(map.entries()).map(([date, items]) => ({
      date,
      items,
      total: items.reduce((a, e) => a + e.amount, 0),
    }));
  }, [filtered]);

  const detailExpense = detailId ? enriched.find((e) => e.id === detailId) : undefined;

  if (!trip) return null;

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.headTop}>
          <div className={styles.title}>รายการทั้งหมด</div>
          <div className={styles.tripName}>{trip.name}</div>
        </div>
        <div className={`noscroll ${styles.chipRow}`}>
          <Chip active={filter === 'all'} gradientWhenActive onClick={() => setFilter('all')}>
            ทั้งหมด
          </Chip>
          {categories.map((c) => (
            <Chip key={c.id} active={filter === c.id} hue={c.hue} onClick={() => setFilter(c.id)}>
              {c.icon} {c.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className={`noscroll ${styles.body}`}>
        {grouped.length > 0 ? (
          grouped.map((g) => (
            <div key={g.date}>
              <div className={styles.groupHead}>
                <span className={styles.groupDate}>{g.date}</span>
                <span className={styles.groupTotal}>{formatMoney(g.total)}</span>
              </div>
              <div className={styles.groupItems}>
                {g.items.map((e) => (
                  <ExpenseRow
                    key={e.id}
                    icon={e.categoryIcon}
                    hue={e.categoryHue}
                    note={e.note}
                    subtitle={`${e.timeShort} · ${e.payerName}`}
                    amount={e.amount}
                    onClick={() => setDetailId(e.id)}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>ยังไม่มีรายการในหมวดนี้</div>
        )}
      </div>

      <BottomNav />

      {detailExpense && (
        <ExpenseDetailModal
          expense={detailExpense}
          tripId={trip.id}
          onClose={() => setDetailId(null)}
          onDelete={() => {
            deleteExpense.mutate(detailExpense.id);
            setDetailId(null);
            showToast('ลบรายการแล้ว');
          }}
        />
      )}
    </div>
  );
}
