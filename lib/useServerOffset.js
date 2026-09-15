import { useEffect, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { db } from './firebase';

export function useServerOffset() {
  const [offset, setOffset] = useState(null);
  useEffect(() => onValue(ref(db, '.info/serverTimeOffset'), snap => {
    setOffset(snap.val() ?? 0);
  }), []);
  return offset;
}
