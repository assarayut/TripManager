import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { useTrips } from '../hooks/useTrips';
import { fetchExpenses } from '../lib/api';
import { TripCard } from '../components/TripCard';
import { formatDateRange } from '../utils/money';
import styles from './TripsScreen.module.css';

export function TripsScreen() {
  const navigate = useNavigate();
  const { data: trips, isLoading } = useTrips();

  const expenseQueries = useQueries({
    queries: (trips ?? []).map((t) => ({
      queryKey: ['expenses', t.id],
      queryFn: () => fetchExpenses(t.id),
    })),
  });

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>TRIP EXPENSE MANAGER</div>
        <div className={styles.title}>ทริปของฉัน</div>
      </div>

      <div className={`noscroll ${styles.list}`}>
        {isLoading && <div className={styles.loading}>กำลังโหลด...</div>}
        {trips?.map((t, idx) => {
          const spent = (expenseQueries[idx]?.data ?? []).reduce((a, e) => a + e.amount, 0);
          return (
            <TripCard
              key={t.id}
              emoji={t.emoji}
              name={t.name}
              dates={formatDateRange(t.startDate, t.endDate)}
              memberCount={t.memberIds.length}
              spent={spent}
              budget={t.budget}
              onClick={() => navigate(`/trip/${t.id}`)}
            />
          );
        })}
        {trips && trips.length === 0 && !isLoading && (
          <div className={styles.emptyState}>ยังไม่มีทริป — สร้างทริปแรกของคุณเลย</div>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.createButton} onClick={() => navigate('/trips/new')}>
          <span className={styles.plus}>＋</span> สร้างทริปใหม่
        </div>
      </div>
    </div>
  );
}
