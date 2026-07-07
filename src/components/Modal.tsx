import type { ReactNode } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ onClose, children }: ModalProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={`noscroll ${styles.sheet}`}>
        <div className={styles.closeButton} onClick={onClose}>
          ✕
        </div>
        {children}
      </div>
    </div>
  );
}
