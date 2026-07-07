import { formatMoney } from '../utils/money';
import styles from './TripCard.module.css';

interface TripCardProps {
  emoji: string;
  name: string;
  dates: string;
  memberCount: number;
  spent: number;
  budget: number;
  onClick: () => void;
}

export function TripCard({ emoji, name, dates, memberCount, spent, budget, onClick }: TripCardProps) {
  const percent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.top}>
        <div>
          <div className={styles.emoji}>{emoji}</div>
          <div className={styles.name}>{name}</div>
          <div className={styles.meta}>
            {dates} · {memberCount} คน
          </div>
        </div>
        <div className={styles.percentBadge}>{percent}%</div>
      </div>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${percent}%` }} />
      </div>
      <div className={styles.footline}>
        <span>ใช้ไป {formatMoney(spent)}</span>
        <span>งบ {formatMoney(budget)}</span>
      </div>
    </div>
  );
}
