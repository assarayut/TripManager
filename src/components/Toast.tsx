import { useToast } from '../hooks/useToast';
import styles from './Toast.module.css';

export function Toast() {
  const { toast } = useToast();
  if (!toast) return null;
  return <div className={styles.toast}>{toast}</div>;
}
