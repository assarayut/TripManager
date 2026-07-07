import { Modal } from './Modal';
import { SlipUploader } from './SlipUploader';
import { useUpdateExpenseSlip } from '../hooks/useTripData';
import type { EnrichedExpense } from '../utils/expenseView';
import styles from './ExpenseDetailModal.module.css';

interface ExpenseDetailModalProps {
  expense: EnrichedExpense;
  tripId: string;
  onClose: () => void;
  onDelete: () => void;
}

export function ExpenseDetailModal({ expense, tripId, onClose, onDelete }: ExpenseDetailModalProps) {
  const updateSlip = useUpdateExpenseSlip(tripId);
  return (
    <Modal onClose={onClose}>
      <div className={styles.icon} style={{ background: `oklch(0.95 0.04 ${expense.categoryHue})` }}>
        {expense.categoryIcon}
      </div>
      <div className={styles.amount}>{expense.amountFmt}</div>
      <div className={styles.note}>{expense.note}</div>
      <div className={styles.meta}>
        {expense.categoryLabel} · {expense.dateShort} {expense.timeShort}
      </div>

      <div className={styles.infoRow}>
        <div>
          <div className={styles.infoLabel}>จ่ายโดย</div>
          <div className={styles.infoValue}>{expense.payerName}</div>
        </div>
        {expense.showSplitNames && (
          <div>
            <div className={styles.infoLabel}>หารกับ</div>
            <div className={styles.infoValue}>{expense.splitNames}</div>
          </div>
        )}
      </div>

      {expense.showReimburseBadge && (
        <div
          className={styles.badge}
          style={{ background: expense.reimburseBg, color: expense.reimburseColor }}
        >
          {expense.reimburseLabel}
        </div>
      )}

      <div className={styles.slipLabel}>สลิป/รูปถ่าย</div>
      <SlipUploader
        tripId={tripId}
        expenseId={expense.id}
        value={expense.slipUrl}
        onChange={(url) => updateSlip.mutate({ expenseId: expense.id, slipUrl: url })}
        placeholder="ยังไม่มีรูปแนบ"
        height={160}
      />

      <div className={styles.deleteButton} onClick={onDelete}>
        🗑 ลบรายการนี้
      </div>
    </Modal>
  );
}
