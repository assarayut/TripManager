import styles from './Keypad.module.css';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'];

interface KeypadProps {
  onPress: (key: string) => void;
}

export function Keypad({ onPress }: KeypadProps) {
  return (
    <div className={styles.grid}>
      {KEYS.map((k) => (
        <div key={k} className={styles.key} onClick={() => onPress(k)}>
          {k === 'back' ? '⌫' : k}
        </div>
      ))}
    </div>
  );
}
