import { useLocation, useNavigate, useParams } from 'react-router-dom';
import styles from './BottomNav.module.css';

export function BottomNav() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const base = `/trip/${tripId}`;
  const isDash = pathname === base;
  const isList = pathname === `${base}/list`;
  const isMoney = pathname === `${base}/money`;

  const itemClass = (active: boolean) => `${styles.item} ${active ? styles.active : ''}`;

  return (
    <div className={styles.nav}>
      <div className={itemClass(isDash)} onClick={() => navigate(base)}>
        หน้าหลัก
      </div>
      <div className={itemClass(isList)} onClick={() => navigate(`${base}/list`)}>
        รายการ
      </div>
      <div className={styles.fab} onClick={() => navigate(`${base}/add`)}>
        +
      </div>
      <div className={itemClass(isMoney)} onClick={() => navigate(`${base}/money`)}>
        เงิน
      </div>
      <div className={styles.item} onClick={() => navigate('/trips')}>
        ทริป
      </div>
    </div>
  );
}
