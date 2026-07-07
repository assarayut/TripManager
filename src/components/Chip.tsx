import type { CSSProperties, ReactNode } from 'react';
import styles from './Chip.module.css';

interface ChipProps {
  children: ReactNode;
  active?: boolean;
  hue?: number;
  onClick?: () => void;
  dashed?: boolean;
  /** Use the brand gradient fill instead of a hue-tinted one when active (e.g. "ทั้งหมด" / "ภาพรวม" chips). */
  gradientWhenActive?: boolean;
  style?: CSSProperties;
}

export function Chip({ children, active, hue = 235, onClick, dashed, gradientWhenActive, style }: ChipProps) {
  if (dashed) {
    return (
      <span className={styles.dashed} onClick={onClick} style={style}>
        {children}
      </span>
    );
  }
  const bg = active ? (gradientWhenActive ? 'var(--gradient-brand)' : `oklch(0.68 0.09 ${hue})`) : `oklch(0.95 0.02 ${hue})`;
  const color = active ? '#fff' : `oklch(0.42 0.03 ${hue})`;
  return (
    <span className={styles.chip} onClick={onClick} style={{ background: bg, color, ...style }}>
      {children}
    </span>
  );
}
