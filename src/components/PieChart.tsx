import { formatShort } from '../utils/money';
import styles from './PieChart.module.css';

export interface PieSegment {
  id: string;
  icon: string;
  label: string;
  hue: number;
  amount: number;
}

interface PieChartProps {
  segments: PieSegment[];
}

export function PieChart({ segments }: PieChartProps) {
  const total = segments.reduce((a, s) => a + s.amount, 0);
  if (total === 0) {
    return <div className={styles.empty}>ยังไม่มีรายจ่าย</div>;
  }
  let acc = 0;
  const stops = segments
    .map((s) => {
      const pct = (s.amount / total) * 100;
      const start = acc;
      acc += pct;
      return `oklch(0.66 0.13 ${s.hue}) ${start}% ${acc}%`;
    })
    .join(', ');

  return (
    <div className={styles.wrap}>
      <div className={styles.donutOuter}>
        <div className={styles.donut} style={{ background: `conic-gradient(${stops})` }} />
        <div className={styles.donutHole}>
          <span className={styles.holeLabel}>รวม</span>
          <span className={styles.holeValue}>{formatShort(total)}</span>
        </div>
      </div>
      <div className={styles.legend}>
        {segments.map((s) => (
          <div key={s.id} className={styles.legendRow}>
            <span className={styles.swatch} style={{ background: `oklch(0.66 0.13 ${s.hue})` }} />
            <span className={styles.legendLabel}>
              {s.icon} {s.label}
            </span>
            <span className={styles.legendPct}>{Math.round((s.amount / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
