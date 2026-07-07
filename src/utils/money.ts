export function formatMoney(n: number | null | undefined): string {
  return '฿' + Math.round(n || 0).toLocaleString('en-US');
}

export function formatShort(n: number | null | undefined): string {
  const rounded = Math.round(n || 0);
  if (rounded >= 1000) {
    return '฿' + (rounded / 1000).toFixed(rounded % 1000 === 0 ? 0 : 1) + 'k';
  }
  return '฿' + rounded;
}

const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

/** "2025-07-13" -> "13 ก.ค." — used for day-chart labels and list-screen date grouping. */
export function formatThaiDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]}`;
}

export function formatTimeShort(timeStr: string): string {
  return timeStr.slice(0, 5);
}

export function formatDateRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start) return 'ยังไม่ระบุวันที่';
  const s = new Date(start + 'T00:00:00');
  const e = end ? new Date(end + 'T00:00:00') : s;
  const by = s.getFullYear() + 543;
  if (s.getTime() === e.getTime()) {
    return `${s.getDate()} ${THAI_MONTHS[s.getMonth()]} ${by}`;
  }
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()}–${e.getDate()} ${THAI_MONTHS[s.getMonth()]} ${by}`;
  }
  return `${s.getDate()} ${THAI_MONTHS[s.getMonth()]} – ${e.getDate()} ${THAI_MONTHS[e.getMonth()]} ${by}`;
}
