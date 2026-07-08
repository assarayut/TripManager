import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { adminListAccounts, adminDeleteAccount, adminResetPassword } from '../lib/api';
import styles from './AdminScreen.module.css';

export function AdminScreen() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const qc = useQueryClient();

  // Guard: only admins may see this screen.
  useEffect(() => {
    if (profile && !profile.isAdmin) navigate('/trips', { replace: true });
  }, [profile, navigate]);

  const { data: accounts = [], isLoading, error } = useQuery({
    queryKey: ['adminAccounts'],
    queryFn: adminListAccounts,
    enabled: !!profile?.isAdmin,
  });

  const handleReset = async (id: string, name: string) => {
    const pw = window.prompt(`ตั้งรหัสผ่านใหม่ให้ "${name}" (อย่างน้อย 6 ตัวอักษร)`);
    if (pw == null) return;
    if (pw.length < 6) {
      showToast('รหัสผ่านอย่างน้อย 6 ตัวอักษร');
      return;
    }
    try {
      await adminResetPassword(id, pw);
      showToast(`รีเซ็ตรหัสผ่านของ ${name} แล้ว ✓`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'รีเซ็ตรหัสผ่านไม่สำเร็จ');
    }
  };

  const handleDelete = async (id: string, name: string, username: string) => {
    if (!window.confirm(`ลบบัญชี "${name}" (${username}) และทริปทั้งหมดที่บัญชีนี้สร้าง? กู้คืนไม่ได้`)) return;
    try {
      await adminDeleteAccount(id);
      showToast(`ลบบัญชี ${name} แล้ว`);
      qc.invalidateQueries({ queryKey: ['adminAccounts'] });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ลบบัญชีไม่สำเร็จ');
    }
  };

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.backButton} onClick={() => navigate('/profile')}>
          ←
        </div>
        <div className={styles.title}>จัดการบัญชีผู้ใช้</div>
      </div>
      <div className={styles.subtitle}>สำหรับผู้ดูแล — ช่วยรีเซ็ตรหัสผ่านหรือลบบัญชีที่จำข้อมูลไม่ได้</div>

      <div className={`noscroll ${styles.body}`}>
        {isLoading && <div className={styles.loading}>กำลังโหลด...</div>}
        {error && <div className={styles.empty}>{error instanceof Error ? error.message : 'โหลดรายชื่อไม่สำเร็จ'}</div>}
        {!isLoading && !error && <div className={styles.count}>ทั้งหมด {accounts.length} บัญชี</div>}

        {accounts.map((a) => {
          const isSelf = a.id === profile?.id;
          return (
            <div key={a.id} className={styles.row}>
              <div className={styles.rowTop}>
                <div className={styles.avatar} style={{ background: `oklch(0.85 0.07 ${(a.username.length * 37) % 360})` }} />
                <div className={styles.names}>
                  <div className={styles.displayName}>{a.displayName}</div>
                  <div className={styles.username}>ชื่อผู้ใช้: {a.username}</div>
                </div>
                {a.isAdmin && <span className={styles.adminBadge}>ผู้ดูแล</span>}
                {isSelf && <span className={styles.youBadge}>คุณ</span>}
              </div>
              {!isSelf && (
                <div className={styles.actions}>
                  <div className={styles.resetButton} onClick={() => handleReset(a.id, a.displayName)}>
                    🔑 รีเซ็ตรหัสผ่าน
                  </div>
                  <div className={styles.deleteButton} onClick={() => handleDelete(a.id, a.displayName, a.username)}>
                    🗑 ลบบัญชี
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
