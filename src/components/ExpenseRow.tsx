import { formatMoney } from '../utils/money';
import styles from './ExpenseRow.module.css';

interface ExpenseRowProps {
  icon: string;
  hue: number;
  note: string;
  subtitle: string;
  amount: number;
  onClick?: () => void;
}

export function ExpenseRow({ icon, hue, note, subtitle, amount, onClick }: ExpenseRowProps) {
  return (
    <div className={styles.row} onClick={onClick}>
      <div className={styles.icon} style={{ background: `oklch(0.95 0.04 ${hue})` }}>
        {icon}
      </div>
      <div className={styles.body}>
        <div className={styles.note}>{note}</div>
        <div className={styles.subtitle}>{subtitle}</div>
      </div>
      <div className={styles.amount}>{formatMoney(amount)}</div>
    </div>
  );
}
