import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { updatePassword, updateDisplayName, deleteMyAccount } from '../lib/api';
import styles from './ProfileScreen.module.css';

const DELETE_KEYWORD = 'ลบบัญชี';

export function ProfileScreen() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const saveDisplayName = async () => {
    if (!displayName.trim()) {
      showToast('กรอกชื่อใหม่ก่อนนะ');
      return;
    }
    setSavingName(true);
    try {
      await updateDisplayName(displayName);
      await refreshProfile();
      showToast('เปลี่ยนชื่อที่แสดงแล้ว ✓');
      setDisplayName('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'เปลี่ยนชื่อไม่สำเร็จ');
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async () => {
    if (password.length < 6) {
      showToast('รหัสผ่านอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (password !== password2) {
      showToast('รหัสผ่านสองช่องไม่ตรงกัน');
      return;
    }
    setSavingPassword(true);
    try {
      await updatePassword(password);
      showToast('เปลี่ยนรหัสผ่านแล้ว ✓');
      setPassword('');
      setPassword2('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    } finally {
      setSavingPassword(false);
    }
  };

  const removeAccount = async () => {
    if (deleteConfirm.trim() !== DELETE_KEYWORD) {
      showToast(`พิมพ์ "${DELETE_KEYWORD}" ให้ถูกต้องเพื่อยืนยัน`);
      return;
    }
    if (!window.confirm('ลบบัญชีนี้และทริปทั้งหมดที่คุณสร้าง? การลบไม่สามารถกู้คืนได้')) return;
    setDeleting(true);
    try {
      await deleteMyAccount();
      // signOut happens inside deleteMyAccount → session becomes null →
      // the app automatically returns to the login screen.
      showToast('ลบบัญชีแล้ว');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ลบบัญชีไม่สำเร็จ');
      setDeleting(false);
    }
  };

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.backButton} onClick={() => navigate('/trips')}>
          ←
        </div>
        <div className={styles.title}>โปรไฟล์ของฉัน</div>
      </div>

      <div className={`noscroll ${styles.body}`}>
        <div className={styles.currentCard}>
          <div className={styles.avatar} style={{ background: `oklch(0.85 0.07 ${profile?.hue ?? 235})` }} />
          <div>
            <div className={styles.currentName}>{profile?.displayName ?? '—'}</div>
            <div className={styles.currentSub}>บัญชีที่กำลังใช้งาน</div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>เปลี่ยนชื่อที่แสดง</div>
          <div className={styles.fieldLabel}>ชื่อใหม่</div>
          <input
            className={styles.input}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={profile?.displayName ?? 'เช่น พ่อ'}
          />
          <div className={styles.hint}>ชื่อนี้จะแสดงในทริป รายการจ่าย และการหารบิล (ชื่อผู้ใช้สำหรับล็อกอินยังเหมือนเดิม)</div>
          <div className={styles.saveButton} data-disabled={savingName} onClick={saveDisplayName}>
            {savingName ? 'กำลังบันทึก...' : 'บันทึกชื่อ'}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>เปลี่ยนรหัสผ่าน</div>
          <div className={styles.fieldLabel}>รหัสผ่านใหม่</div>
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="อย่างน้อย 6 ตัวอักษร"
          />
          <div className={styles.fieldLabel}>ยืนยันรหัสผ่านใหม่</div>
          <input
            className={styles.input}
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            placeholder="พิมพ์รหัสผ่านอีกครั้ง"
          />
          <div className={styles.saveButton} data-disabled={savingPassword} onClick={savePassword}>
            {savingPassword ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่าน'}
          </div>
        </div>

        <div className={styles.dangerCard}>
          <div className={styles.dangerTitle}>ลบบัญชีถาวร</div>
          <div className={styles.dangerText}>
            การลบบัญชีจะลบทริปทั้งหมดที่คุณสร้าง รวมถึงรายจ่ายในทริปเหล่านั้น และเอาคุณออกจากทริปของคนอื่น — กู้คืนไม่ได้
            <br />
            พิมพ์ <b>{DELETE_KEYWORD}</b> เพื่อยืนยัน
          </div>
          <input
            className={styles.input}
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={DELETE_KEYWORD}
          />
          <div className={styles.dangerButton} data-disabled={deleting} onClick={removeAccount}>
            {deleting ? 'กำลังลบ...' : '🗑 ลบบัญชีของฉัน'}
          </div>
        </div>
      </div>
    </div>
  );
}
