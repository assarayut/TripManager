import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useAllProfiles } from '../hooks/useTripData';
import { useCreateTrip, useJoinTrip } from '../hooks/useTrips';
import { Chip } from '../components/Chip';
import { formatMoney } from '../utils/money';
import styles from './CreateTripScreen.module.css';

const CATEGORIES = [
  { id: 'fuel', label: 'น้ำมัน/เดินทาง', icon: '⛽' },
  { id: 'food', label: 'อาหาร', icon: '🍜' },
  { id: 'hotel', label: 'ที่พัก', icon: '🏨' },
  { id: 'activity', label: 'กิจกรรม', icon: '🎟️' },
  { id: 'shopping', label: 'ช้อปปิ้ง/ของฝาก', icon: '🛍️' },
  { id: 'other', label: 'อื่นๆ', icon: '💰' },
];

export function CreateTripScreen() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { data: allProfiles } = useAllProfiles();
  const createTrip = useCreateTrip();
  const joinTrip = useJoinTrip();

  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [inviteCode, setInviteCode] = useState('');

  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [moneyMode, setMoneyMode] = useState<'equal' | 'pool'>('equal');
  const [memberIds, setMemberIds] = useState<string[]>(profile ? [profile.id] : []);
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, string>>({});

  const categoryBudgetSum = Object.values(categoryBudgets).reduce((a, v) => a + (parseFloat(v) || 0), 0);

  const toggleMember = (id: string) => {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const save = async () => {
    if (!name.trim() || !budget || memberIds.length === 0) {
      showToast('กรอกชื่อทริป งบประมาณ และสมาชิกให้ครบก่อนนะ');
      return;
    }
    const parsedBudgets: Record<string, number> = {};
    Object.entries(categoryBudgets).forEach(([id, v]) => {
      const n = parseFloat(v);
      if (n > 0) parsedBudgets[id] = n;
    });
    try {
      const trip = await createTrip.mutateAsync({
        name,
        budget: parseFloat(budget) || 0,
        startDate: startDate || null,
        endDate: endDate || null,
        moneyMode,
        memberIds,
        categoryBudgets: parsedBudgets,
      });
      showToast(`สร้างทริปใหม่แล้ว 🎉 รหัสเชิญ: ${trip.inviteCode}`);
      navigate(`/trip/${trip.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'สร้างทริปไม่สำเร็จ');
    }
  };

  const join = async () => {
    if (!inviteCode.trim()) {
      showToast('กรอกรหัสเชิญก่อนนะ');
      return;
    }
    try {
      const trip = await joinTrip.mutateAsync(inviteCode);
      showToast('เข้าร่วมทริปแล้ว 🎉');
      navigate(`/trip/${trip.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'เข้าร่วมทริปไม่สำเร็จ');
    }
  };

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.backButton} onClick={() => navigate('/trips')}>
          ←
        </div>
        <div className={styles.title}>{mode === 'create' ? 'สร้างทริปใหม่' : 'เข้าร่วมทริป'}</div>
      </div>

      <div className={styles.modeSwitch}>
        <Chip active={mode === 'create'} onClick={() => setMode('create')}>
          สร้างทริปใหม่
        </Chip>
        <Chip active={mode === 'join'} onClick={() => setMode('join')}>
          เข้าร่วมด้วยรหัสเชิญ
        </Chip>
      </div>

      {mode === 'join' ? (
        <div className={`noscroll ${styles.body}`}>
          <div className={styles.fieldLabel}>รหัสเชิญ</div>
          <input
            className={styles.input}
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="เช่น AB12CD"
          />
          <div className={styles.saveButton} onClick={join}>
            เข้าร่วมทริป
          </div>
        </div>
      ) : (
        <div className={`noscroll ${styles.body}`}>
          <div className={styles.fieldLabel}>ชื่อทริป</div>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="เช่น เชียงใหม่ ครอบครัว"
          />

          <div className={styles.fieldLabel}>งบประมาณรวม (บาท)</div>
          <input
            className={styles.input}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="เช่น 15000"
          />

          <div className={styles.fieldLabel}>วิธีบริหารเงินในทริป</div>
          <div className={styles.modeCards}>
            {[
              { id: 'equal' as const, icon: '⚖️', title: 'หารเท่ากัน', desc: 'ทุกคนจ่ายเองแล้วมาหารเฉลี่ยตอนจบทริป' },
              { id: 'pool' as const, icon: '🏦', title: 'เงินกองกลาง', desc: 'ลงขันเข้ากระเป๋ากลาง แล้วจ่ายจากกองกลาง หรือใครจ่ายไปก่อนก็ขอคืนทีหลังได้' },
            ].map((m) => {
              const selected = moneyMode === m.id;
              return (
                <div
                  key={m.id}
                  className={styles.modeCard}
                  style={{
                    background: selected ? 'oklch(0.95 0.05 178)' : '#fff',
                    borderColor: selected ? 'oklch(0.7 0.09 178)' : 'var(--color-border-input)',
                  }}
                  onClick={() => setMoneyMode(m.id)}
                >
                  <span className={styles.modeIcon}>{m.icon}</span>
                  <div className={styles.modeBody}>
                    <div
                      className={styles.modeTitle}
                      style={{ color: selected ? 'oklch(0.38 0.09 178)' : 'var(--color-text-heading)' }}
                    >
                      {m.title}
                    </div>
                    <div className={styles.modeDesc}>{m.desc}</div>
                  </div>
                  <span className={styles.modeCheck}>{selected ? '✓' : ''}</span>
                </div>
              );
            })}
          </div>

          <div className={styles.dateRow}>
            <div className={styles.dateField}>
              <div className={styles.fieldLabel}>วันที่เริ่ม</div>
              <input
                type="date"
                className={styles.input}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className={styles.dateField}>
              <div className={styles.fieldLabel}>วันที่กลับ</div>
              <input type="date" className={styles.input} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className={styles.fieldLabel}>สมาชิกในทริป</div>
          <div className={styles.chipRow}>
            {(allProfiles ?? []).map((m) => (
              <Chip key={m.id} active={memberIds.includes(m.id)} hue={m.hue} onClick={() => toggleMember(m.id)}>
                {memberIds.includes(m.id) ? '✓ ' : ''}
                {m.displayName}
                {m.id === profile?.id ? ' (คุณ)' : ''}
              </Chip>
            ))}
          </div>
          <div className={styles.inviteHint}>เพื่อนที่ยังไม่มีในนี้ ให้สมัครบัญชีก่อน แล้วเข้าร่วมทริปด้วยรหัสเชิญหลังสร้างเสร็จ</div>

          <div className={styles.budgetHeader}>
            <span className={styles.fieldLabel} style={{ marginBottom: 0 }}>
              งบประมาณแต่ละหมวด (ไม่บังคับ)
            </span>
            <span className={styles.budgetSum}>รวม {formatMoney(categoryBudgetSum)}</span>
          </div>
          <div className={styles.categoryBudgetList}>
            {CATEGORIES.map((c) => (
              <div key={c.id} className={styles.categoryBudgetRow}>
                <span className={styles.categoryIcon}>{c.icon}</span>
                <span className={styles.categoryLabel}>{c.label}</span>
                <input
                  className={styles.categoryInput}
                  value={categoryBudgets[c.id] || ''}
                  onChange={(e) => setCategoryBudgets((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  placeholder="0"
                />
              </div>
            ))}
          </div>

          <div className={styles.saveButton} onClick={save}>
            สร้างทริป
          </div>
        </div>
      )}
    </div>
  );
}
