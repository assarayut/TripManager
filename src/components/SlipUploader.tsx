import { useRef, useState } from 'react';
import { uploadSlip } from '../lib/api';
import styles from './SlipUploader.module.css';

interface SlipUploaderProps {
  tripId: string;
  expenseId: string;
  value: string | null;
  onChange: (url: string) => void;
  placeholder?: string;
  height?: number;
}

export function SlipUploader({ tripId, expenseId, value, onChange, placeholder, height = 150 }: SlipUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadSlip(tripId, expenseId, file);
      onChange(url);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={styles.slot}
      style={{ height }}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className={styles.hiddenInput}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      {value ? (
        <img src={value} alt="สลิป" className={styles.preview} />
      ) : (
        <span className={styles.placeholder}>{uploading ? 'กำลังอัปโหลด...' : placeholder || 'แตะหรือลากรูปสลิปมาวางที่นี่'}</span>
      )}
    </div>
  );
}
