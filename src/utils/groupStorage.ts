import { createMMKV } from 'react-native-mmkv';
import type { RecentGroup } from '../types';

const storage = createMMKV({ id: 'baagam-storage' });
const RECENT_KEY = 'baagam_recent_groups';

export function getRecentGroups(): RecentGroup[] {
  try {
    return JSON.parse(storage.getString(RECENT_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveRecentGroup(id: string, name: string) {
  try {
    const existing = getRecentGroups().filter(g => g.id !== id);
    const updated = [{ id, name, visitedAt: new Date().toISOString() }, ...existing].slice(0, 20);
    storage.set(RECENT_KEY, JSON.stringify(updated));
  } catch {}
}

export function removeRecentGroup(id: string) {
  try {
    const updated = getRecentGroups().filter(g => g.id !== id);
    storage.set(RECENT_KEY, JSON.stringify(updated));
  } catch {}
}
