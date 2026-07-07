import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTrip, useTripMembers, useCategories, useExpenses, useDeleteExpense } from '../hooks/useTripData';
import { useDeleteTrip } from '../hooks/useTrips';
import { useAuth } from '../hooks/useAuth';
import { BottomNav } from '../components/BottomNav';
import { Chip } from '../components/Chip';
import { CategoryRow } from '../components/CategoryRow';
import { ExpenseRow } from '../components/ExpenseRow';
import { DayBarChart } from '../components/DayBarChart';
import { PieChart } from '../components/PieChart';
import { ExpenseDetailModal } from '../components/ExpenseDetailModal';
import { useToast } from '../hooks/useToast';
import { formatDateRange, formatMoney, formatThaiDateShort } from '../utils/money';
import { enrichExpense } from '../utils/expenseView';
import styles from './DashboardScreen.module.css';

export function DashboardScreen() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: trip } = useTrip(tripId);
  const { data: members = [] } = useTripMembers(trip?.memberIds);
  const { data: categories = [] } = useCategories(tripId);
  const { data: expenses = [] } = useExpenses(tripId);
  const deleteExpense = useDeleteExpense(tripId);
  const deleteTrip = useDeleteTrip();
  const { profile } = useAuth();
  const isCreator = !!profile && !!trip && trip.createdBy === profile.id;

  const handleDeleteTrip = () => {
    if (!trip) return;
    if (!window.confirm(`ลบทริป "${trip.name}" และรายการทั้งหมดในทริปนี้? การลบไม่สามารถกู้คืนได้`)) return;
    deleteTrip.mutate(trip.id, {
      onSuccess: () => {
        showToast('ลบทริปแล้ว');
        navigate('/trips');
      },
      onError: (err) => showToast(err instanceof Error ? err.message : 'ลบทริปไม่สำเร็จ'),
    });
  };

  const [chartCategory, setChartCategory] = useState('all');
  const [chartDay, setChartDay] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const catTotals = useMemo(
    () => categories.map((c) => ({ ...c, amount: expenses.filter((e) => e.categoryId === c.id).reduce((a, e) => a + e.amount, 0) })),
    [categories, expenses]
  );
  const totalSpent = catTotals.reduce((a, c) => a + c.amount, 0);
  const remaining = (trip?.budget ?? 0) - totalSpent;
  const percent = trip && trip.budget > 0 ? Math.min(100, Math.round((totalSpent / trip.budget) * 100)) : 0;

  const categoryBreakdown = catTotals.filter((c) => c.amount > 0 || (trip?.categoryBudgets[c.id] ?? 0) > 0);

  const enrichedSorted = useMemo(
    () =>
      [...expenses]
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .map((e) => enrichExpense(e, categories, members)),
    [expenses, categories, members]
  );
  const recentExpenses = enrichedSorted.slice(0, 3);

  // day bar chart, scoped to selected chart category
  const dayGroups = useMemo(() => {
    const map = new Map<number, { dayNum: number; dateStr: string; items: typeof expenses }>();
    expenses.forEach((e) => {
      const dayNum = new Date(e.expenseDate + 'T00:00:00').getDate();
      if (!map.has(dayNum)) map.set(dayNum, { dayNum, dateStr: e.expenseDate, items: [] });
      map.get(dayNum)!.items.push(e);
    });
    return Array.from(map.values()).sort((a, b) => a.dayNum - b.dayNum);
  }, [expenses]);

  const dayBars = dayGroups.map((g) => ({
    dayNum: g.dayNum,
    shortLabel: formatThaiDateShort(g.dateStr),
    total: (chartCategory === 'all' ? g.items : g.items.filter((e) => e.categoryId === chartCategory)).reduce(
      (a, e) => a + e.amount,
      0
    ),
  }));

  // pie chart, scoped to selected day (or whole trip)
  const pieScope = chartDay != null ? expenses.filter((e) => new Date(e.expenseDate + 'T00:00:00').getDate() === chartDay) : expenses;
  const pieSegments = categories
    .map((c) => ({ id: c.id, icon: c.icon, label: c.label, hue: c.hue, amount: pieScope.filter((e) => e.categoryId === c.id).reduce((a, e) => a + e.amount, 0) }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const pieScopeLabel = chartDay != null ? `วัน ${dayGroups.find((g) => g.dayNum === chartDay)?.dateStr ? formatThaiDateShort(dayGroups.find((g) => g.dayNum === chartDay)!.dateStr) : ''}` : 'ทั้งทริป';

  const detailExpense = detailId ? enrichedSorted.find((e) => e.id === detailId) : undefined;

  if (!trip) return null;

  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <div className={styles.heroEyebrow}>ทริปที่กำลังใช้งาน</div>
            <div className={styles.heroTitle}>{trip.name}</div>
            <div className={styles.heroEyebrow}>{formatDateRange(trip.startDate, trip.endDate)}</div>
          </div>
          <div className={styles.switchButton} onClick={() => navigate('/trips')}>
            เปลี่ยนทริป
          </div>
        </div>

        <div className={styles.budgetCard}>
          <div className={styles.budgetHead}>
            <span>คงเหลือในงบ</span>
            <span className={styles.budgetPill}>{percent}% ใช้แล้ว</span>
          </div>
          <div className={styles.remaining}>{formatMoney(remaining)}</div>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${percent}%` }} />
          </div>
          <div className={styles.budgetFoot}>
            <span>ใช้ไป {formatMoney(totalSpent)}</span>
            <span>งบ {formatMoney(trip.budget)}</span>
          </div>
        </div>
      </div>

      <div className={`noscroll ${styles.body}`}>
        {categoryBreakdown.length > 0 && (
          <>
            <div className={styles.sectionTitle}>หมวดหมู่</div>
            <div className={styles.categoryList}>
              {categoryBreakdown.map((c) => (
                <CategoryRow key={c.id} icon={c.icon} hue={c.hue} label={c.label} spent={c.amount} budget={trip.categoryBudgets[c.id]} />
              ))}
            </div>
          </>
        )}

        <div className={styles.sectionTitle}>กราฟรายจ่าย</div>
        <div className={`noscroll ${styles.chipRow}`}>
          <Chip active={chartCategory === 'all'} gradientWhenActive onClick={() => setChartCategory('all')}>
            📊 ภาพรวม
          </Chip>
          {categories.map((c) => (
            <Chip key={c.id} active={chartCategory === c.id} hue={c.hue} onClick={() => setChartCategory(c.id)}>
              {c.icon} {c.label}
            </Chip>
          ))}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardHint}>
              รายจ่ายรายวัน · {chartCategory === 'all' ? 'ทุกหมวด' : categories.find((c) => c.id === chartCategory)?.label}
            </span>
            <span className={styles.cardHintAccent}>แตะแท่งเพื่อดูสัดส่วน</span>
          </div>
          <DayBarChart bars={dayBars} activeDay={chartDay} onSelect={(d) => setChartDay((prev) => (prev === d ? null : d))} />
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>สัดส่วนรายจ่าย</span>
            <span className={styles.cardHintAccent}>{pieScopeLabel}</span>
          </div>
          <PieChart segments={pieSegments} />
        </div>

        <div className={styles.recentHead}>
          <span className={styles.sectionTitle} style={{ marginBottom: 0 }}>
            รายการล่าสุด
          </span>
          <span className={styles.viewAll} onClick={() => navigate(`/trip/${tripId}/list`)}>
            ดูทั้งหมด ›
          </span>
        </div>

        {recentExpenses.length > 0 ? (
          <div className={styles.expenseList}>
            {recentExpenses.map((e) => (
              <ExpenseRow
                key={e.id}
                icon={e.categoryIcon}
                hue={e.categoryHue}
                note={e.note}
                subtitle={`${e.categoryLabel} · ${e.payerName}`}
                amount={e.amount}
                onClick={() => setDetailId(e.id)}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState} onClick={() => navigate(`/trip/${tripId}/add`)}>
            ยังไม่มีรายการ — แตะเพื่อเพิ่มรายการแรกของทริปนี้
          </div>
        )}

        {isCreator && (
          <div
            onClick={handleDeleteTrip}
            style={{
              cursor: 'pointer',
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 28,
              background: 'oklch(0.95 0.05 25)',
              color: 'oklch(0.5 0.13 25)',
              borderRadius: 14,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            🗑 ลบทริปนี้
          </div>
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
