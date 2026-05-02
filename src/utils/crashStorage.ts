import { MMKV } from 'react-native-mmkv';
import { Platform } from 'react-native';

const KEY = 'pending_crash';

let _storage: MMKV | null = null;

function storage(): MMKV {
  if (!_storage) {
    _storage = new MMKV({ id: 'baagam-crashes' });
  }
  return _storage;
}

export type CrashReport = {
  timestamp: string;
  appVersion: string;
  platform: string;
  message: string;
  stack: string;
  componentStack: string;
};

export function saveCrashReport(error: Error, componentStack: string): void {
  try {
    const report: CrashReport = {
      timestamp: new Date().toISOString(),
      appVersion: '1.0',
      platform: Platform.OS,
      message: error.message,
      stack: error.stack ?? '',
      componentStack,
    };
    storage().set(KEY, JSON.stringify(report));
  } catch {}
}

export function getPendingCrashReport(): CrashReport | null {
  try {
    const raw = storage().getString(KEY);
    return raw ? (JSON.parse(raw) as CrashReport) : null;
  } catch {
    return null;
  }
}

export function clearCrashReport(): void {
  try {
    storage().delete(KEY);
  } catch {}
}
