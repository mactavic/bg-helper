import { useEffect, useState } from 'react';

/** 存在本机浏览器里的状态（Safari 无痕模式下可能失效，失效时只是不记忆） */
export function useStored(key, initial) {
  const [v, setV] = useState(() => {
    try {
      const raw = localStorage.getItem('bg:' + key);
      return raw == null ? initial : JSON.parse(raw);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('bg:' + key, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  }, [key, v]);
  return [v, setV];
}
