import { formatMoney } from '../utils/money';
import styles from './CategoryRow.module.css';

interface CategoryRowProps {
  icon: string;
  hue: number;
  label: string;
  spent: number;
  budget?: number;
}

export function CategoryRow({ icon, hue, label, spent, budget }: CategoryRowProps) {
  const hasBudget = !!budget && budget > 0;
  const percentOfBudget = hasBudget ? Math.round((spent / (budget as number)) * 100) : 0;
  const overBudget = hasBudget && percentOfBudget > 100;
  const barColor = overBudget ? 'oklch(0.58 0.16 25)' : `oklch(0.62 0.1 ${hue})`;

  return (
    <div className={styles.row} style={{ background: `oklch(0.95 0.04 ${hue})` }}>
      <div className={styles.icon}>{icon}</div>
      <div className={styles.body}>
        <div className={styles.headline}>
          <span className={styles.label}>{label}</span>
          <span className={styles.spent}>{formatMoney(spent)}</span>
        </div>
        {hasBudget && (
          <>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ width: `${Math.min(100, percentOfBudget)}%`, background: barColor }}
              />
            </div>
            <div className={styles.footline}>
              <span className={styles.budgetLabel}>จากงบ {formatMoney(budget)}</span>
              <span className={styles.percent} style={{ color: barColor }}>
                {percentOfBudget}%
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
