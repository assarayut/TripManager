import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useTrip,
  useTripMembers,
  useCategories,
  useAddCustomCategory,
  useAddExpense,
} from '../hooks/useTripData';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Chip } from '../components/Chip';
import { Keypad } from '../components/Keypad';
import { SlipUploader } from '../components/SlipUploader';
import { generateExpenseId } from '../lib/api';
import { formatMoney } from '../utils/money';
import styles from './AddExpenseScreen.module.css';

const HUES = [238, 300, 178, 145, 20, 60, 90, 270, 330, 200, 40, 260];

export function AddExpenseScreen() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { data: trip } = useTrip(tripId);
  const { data: members = [] } = useTripMembers(trip?.memberIds);
  const { data: categories = [] } = useCategories(tripId);
  const addCustomCategory = useAddCustomCategory(tripId);
  const addExpense = useAddExpense(tripId);

  const isPoolMode = trip?.moneyMode === 'pool';

  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [payerId, setPayerId] = useState<string | null>(null);
  const [payFromPool, setPayFromPool] = useState(false);
  const [selfPay, setSelfPay] = useState(false);
  const [splitIds, setSplitIds] = useState<string[]>([]);
  const [splitIdsInitialized, setSplitIdsInitialized] = useState(false);
  const [slipUrl, setSlipUrl] = useState<string | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const expenseId = useMemo(() => generateExpenseId(), []);

  useEffect(() => {
    if (trip && !splitIdsInitialized) {
      setSplitIds(trip.memberIds);
      setSplitIdsInitialized(true);
    }
  }, [trip, splitIdsInitialized]);

  const pressKey = (k: string) => {
    setAmount((prev) => {
      if (k === 'back') return prev.slice(0, -1);
      if (k === '.') return prev.includes('.') ? prev : (prev === '' ? '0' : prev) + '.';
      if (prev.includes('.') && prev.split('.')[1].length >= 2) return prev;
      return prev === '0' || prev === '' ? k : prev + k;
    });
  };

  const toggleSplit = (id: string) => {
    setSplitIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const createCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    const hue = HUES[categories.length % HUES.length];
    const cat = await addCustomCategory.mutateAsync({ label: name, hue });
    setCategoryId(cat.id);
    setNewCategoryName('');
    setAddingCategory(false);
  };

  const perPersonFmt = formatMoney((parseFloat(amount) || 0) / (splitIds.length || 1));

  const save = async () => {
    const amt = parseFloat(amount);
    const missingPayer = isPoolMode ? !payFromPool && !payerId : !payerId;
    if (!amt || amt <= 0 || !categoryId || missingPayer || (!isPoolMode && splitIds.length === 0)) {
      showToast('กรอกจำนวนเงิน หมวดหมู่ และผู้จ่ายให้ครบก่อนนะ');
      return;
    }
    try {
      await addExpense.mutateAsync({
        id: expenseId,
        categoryId,
        amount: amt,
        note,
        payerId: isPoolMode ? (payFromPool ? null : payerId) : payerId,
        isPoolPayment: isPoolMode && payFromPool,
        splitIds: isPoolMode ? [] : splitIds,
        needsReimbursement: isPoolMode && !payFromPool,
        slipUrl,
      });
      showToast('บันทึกค่าใช้จ่ายแล้ว ✓');
      navigate(`/trip/${tripId}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    }
  };

  if (!trip) return null;

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.backButton} onClick={() => navigate(`/trip/${tripId}`)}>
          ←
        </div>
        <div className={styles.title}>เพิ่มค่าใช้จ่าย</div>
      </div>

      <div className={`noscroll ${styles.body}`}>
        <div className={styles.amountCard}>
          <div className={styles.amountLabel}>จำนวนเงิน</div>
          <div className={styles.amountValue}>฿{amount || '0'}</div>
        </div>

        <Keypad onPress={pressKey} />

        <div className={styles.fieldLabel}>หมวดหมู่</div>
        <div className={styles.chipRow}>
          {categories.map((c) => (
            <Chip key={c.id} active={categoryId === c.id} hue={c.hue} onClick={() => setCategoryId(c.id)}>
              {c.icon} {c.label}
            </Chip>
          ))}
          <Chip dashed onClick={() => setAddingCategory((v) => !v)}>
            ＋ หมวดใหม่
          </Chip>
        </div>
        {addingCategory && (
          <div className={styles.newCategoryRow}>
            <input
              className={styles.input}
              style={{ marginBottom: 0 }}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="ชื่อหมวดใหม่ เช่น ค่าไกด์"
            />
            <div className={styles.addCategoryButton} onClick={createCategory}>
              เพิ่ม
            </div>
          </div>
        )}

        <div className={styles.fieldLabel} style={{ marginTop: 10 }}>
          รายละเอียด
        </div>
        <input
          className={styles.input}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="เช่น ค่าอาหารมื้อเที่ยง"
        />

        {isPoolMode ? (
          <>
            <div className={styles.fieldLabel}>จ่ายด้วยวิธีไหน</div>
            <div className={styles.payMethodRow}>
              <div
                className={styles.payMethodCard}
                style={{
                  background: payFromPool ? 'var(--gradient-brand)' : 'oklch(0.96 0.015 235)',
                  color: payFromPool ? '#fff' : 'oklch(0.42 0.03 235)',
                }}
                onClick={() => {
                  setPayFromPool(true);
                  setSelfPay(false);
                  setPayerId(null);
                }}
              >
                <div className={styles.payMethodIcon}>🏦</div>
                <div className={styles.payMethodTitle}>จ่ายจากกองกลาง</div>
              </div>
              <div
                className={styles.payMethodCard}
                style={{
                  background: selfPay ? 'var(--gradient-brand)' : 'oklch(0.96 0.015 235)',
                  color: selfPay ? '#fff' : 'oklch(0.42 0.03 235)',
                }}
                onClick={() => {
                  setSelfPay(true);
                  setPayFromPool(false);
                }}
              >
                <div className={styles.payMethodIcon}>🙋</div>
                <div className={styles.payMethodTitle}>จ่ายเอง</div>
                <div className={styles.payMethodSub}>ขอคืนทีหลัง</div>
              </div>
            </div>
            {selfPay && (
              <div className={styles.chipRow} style={{ marginBottom: 14 }}>
                {members.map((m) => (
                  <Chip key={m.id} active={payerId === m.id} hue={m.hue} onClick={() => setPayerId(m.id)}>
                    {m.displayName}
                  </Chip>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className={styles.fieldLabel}>ใครจ่าย</div>
            <div className={styles.chipRow} style={{ marginBottom: 14 }}>
              {members.map((m) => (
                <Chip key={m.id} active={payerId === m.id} hue={m.hue} onClick={() => setPayerId(m.id)}>
                  {m.displayName}
                </Chip>
              ))}
            </div>

            <div className={styles.splitHead}>
              <span className={styles.fieldLabel} style={{ marginBottom: 0 }}>
                หารกับ
              </span>
              <span className={styles.perPerson}>คนละ {perPersonFmt}</span>
            </div>
            <div className={styles.chipRow} style={{ marginBottom: 16 }}>
              {members.map((m) => (
                <Chip key={m.id} active={splitIds.includes(m.id)} hue={m.hue} onClick={() => toggleSplit(m.id)}>
                  {splitIds.includes(m.id) ? '✓ ' : ''}
                  {m.displayName}
                </Chip>
              ))}
            </div>
          </>
        )}

        <div className={styles.fieldLabel}>แนบสลิป / รูปถ่าย</div>
        {profile && (
          <SlipUploader tripId={trip.id} expenseId={expenseId} value={slipUrl} onChange={setSlipUrl} height={150} />
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.saveButton} onClick={save}>
          ✓ บันทึกค่าใช้จ่าย
        </div>
      </div>
    </div>
  );
}
