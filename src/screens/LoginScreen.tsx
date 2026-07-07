import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import styles from './LoginScreen.module.css';

export function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError('กรอกชื่อผู้ใช้และรหัสผ่านให้ครบก่อนนะ');
      return;
    }
    if (mode === 'signup' && !displayName.trim()) {
      setError('กรอกชื่อที่จะแสดงให้เพื่อนในทริปเห็นด้วยนะ');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signUp(username, password, displayName);
      } else {
        await signIn(username, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด ลองอีกครั้งนะ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>TRIP EXPENSE MANAGER</div>
        <div className={styles.title}>{mode === 'signin' ? 'เข้าสู่ระบบ' : 'สร้างบัญชีใหม่'}</div>
      </div>

      <form className={styles.form} onSubmit={submit}>
        <div className={styles.fieldLabel}>ชื่อผู้ใช้</div>
        <input
          className={styles.input}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="เช่น dad2025"
          autoCapitalize="none"
        />

        {mode === 'signup' && (
          <>
            <div className={styles.fieldLabel}>ชื่อที่แสดง</div>
            <input
              className={styles.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="เช่น พ่อ"
            />
          </>
        )}

        <div className={styles.fieldLabel}>รหัสผ่าน</div>
        <input
          className={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="อย่างน้อย 6 ตัวอักษร"
        />

        {error && <div className={styles.error}>{error}</div>}

        <button className={styles.submit} type="submit" disabled={busy}>
          {busy ? 'กำลังดำเนินการ...' : mode === 'signin' ? 'เข้าสู่ระบบ' : 'สร้างบัญชี'}
        </button>
      </form>

      <div className={styles.switchMode} onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
        {mode === 'signin' ? 'ยังไม่มีบัญชี? สร้างบัญชีใหม่' : 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ'}
      </div>
    </div>
  );
}
