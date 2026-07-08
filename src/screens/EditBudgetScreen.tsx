import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTrip, useCategories, useExpenses, useUpdateTripBudget } from '../hooks/useTripData';
import { useToast } from '../hooks/useToast';
import { formatMoney } from '../utils/money';
import styles from './EditBudgetScreen.module.css';

export function EditBudgetScreen() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: trip } = useTrip(tripId);
  const { data: categories = [] } = useCategories(tripId);
  const { data: expenses = [] } = useExpenses(tripId);
  const updateBudget = useUpdateTripBudget(tripId);

  const [budget, setBudget] = useState('');
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, string>>({});
  const [seeded, setSeeded] = useState(false);

  // Seed the form from the trip once it loads.
  useEffect(() => {
    if (trip && !seeded) {
      setBudget(String(trip.budget || ''));
      const seed: Record<string, string> = {};
      Object.entries(trip.categoryBudgets).forEach(([id, v]) => {
        seed[id] = String(v);
      });
      setCategoryBudgets(seed);
      setSeeded(true);
    }
  }, [trip, seeded]);

  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.categoryId] = (map[e.categoryId] || 0) + e.amount;
    });
    return map;
  }, [expenses]);

  const categorySum = Object.values(categoryBudgets).reduce((a, v) => a + (parseFloat(v) || 0), 0);
  const totalBudget = parseFloat(budget) || 0;
  const overAllocated = categorySum > totalBudget && totalBudget > 0;

  const save = () => {
    if (!budget || totalBudget <= 0) {
      showToast('กรอกงบประมาณรวมให้ถูกต้องก่อนนะ');
      return;
    }
    const parsed: Record<string, number> = {};
    categories.forEach((c) => {
      parsed[c.id] = parseFloat(categoryBudgets[c.id]) || 0;
    });
    updateBudget.mutate(
      { budget: totalBudget, categoryBudgets: parsed },
      {
        onSuccess: () => {
          showToast('อัปเดตงบประมาณแล้ว ✓');
          navigate(`/trip/${tripId}`);
        },
        onError: (err) => showToast(err instanceof Error ? err.message : 'อัปเดตงบไม่สำเร็จ'),
      }
    );
  };

  if (!trip) return null;

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.backButton} onClick={() => navigate(`/trip/${tripId}`)}>
          ←
        </div>
        <div className={styles.title}>แก้ไขงบประมาณ</div>
      </div>

      <div className={`noscroll ${styles.body}`}>
        <div className={styles.fieldLabel}>งบประมาณรวม (บาท)</div>
        <input
          className={styles.input}
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="เช่น 15000"
          inputMode="numeric"
        />

        <div className={styles.sectionHead}>
          <span className={styles.sectionLabel}>งบประมาณแต่ละหมวด (ไม่บังคับ)</span>
          <span className={`${styles.sum} ${overAllocated ? styles.overBudget : ''}`}>
            รวมหมวด {formatMoney(categorySum)}
          </span>
        </div>
        <div className={styles.list}>
          {categories.map((c) => {
            const spent = spentByCategory[c.id] || 0;
            return (
              <div key={c.id} className={styles.row}>
                <span className={styles.icon}>{c.icon}</span>
                <span className={styles.catLabel}>{c.label}</span>
                {spent > 0 && <span className={styles.spent}>ใช้ไป {formatMoney(spent)}</span>}
                <input
                  className={styles.catInput}
                  value={categoryBudgets[c.id] || ''}
                  onChange={(e) => setCategoryBudgets((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  placeholder="0"
                  inputMode="numeric"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.saveButton} data-disabled={updateBudget.isPending} onClick={save}>
          {updateBudget.isPending ? 'กำลังบันทึก...' : 'บันทึกงบประมาณ'}
        </div>
      </div>
    </div>
  );
}
