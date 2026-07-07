import { formatShort } from '../utils/money';
import styles from './DayBarChart.module.css';

export interface DayBar {
  dayNum: number;
  shortLabel: string;
  total: number;
}

interface DayBarChartProps {
  bars: DayBar[];
  activeDay: number | null;
  onSelect: (dayNum: number) => void;
}

export function DayBarChart({ bars, activeDay, onSelect }: DayBarChartProps) {
  if (bars.length === 0) {
    return <div className={styles.empty}>ยังไม่มีข้อมูลในหมวดนี้</div>;
  }
  const maxTotal = Math.max(1, ...bars.map((b) => b.total));
  return (
    <div className={styles.chart}>
      {bars.map((b) => {
        const active = activeDay === b.dayNum;
        const heightPct = b.total > 0 ? Math.max(4, Math.round((b.total / maxTotal) * 100)) : 2;
        return (
          <div key={b.dayNum} className={styles.col} onClick={() => onSelect(b.dayNum)}>
            <span className={styles.amount} style={{ color: active ? 'oklch(0.42 0.1 235)' : 'oklch(0.55 0.02 235)' }}>
              {formatShort(b.total)}
            </span>
            <div
              className={styles.bar}
              style={{
                height: `${heightPct}%`,
                background: active
                  ? 'linear-gradient(180deg, oklch(0.62 0.12 235), oklch(0.68 0.1 200))'
                  : 'oklch(0.83 0.07 205)',
              }}
            />
            <span
              className={styles.label}
              style={{
                color: active ? 'oklch(0.4 0.09 235)' : 'oklch(0.55 0.02 235)',
                fontWeight: active ? 700 : 500,
              }}
            >
              {b.shortLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}
