import { MMKV } from 'react-native-mmkv';

const KEY = 'user_name';

let _storage: MMKV | null = null;

function storage(): MMKV {
  if (!_storage) {
    _storage = new MMKV({ id: 'splitlite-user' });
  }
  return _storage;
}

export function getUserName(): string {
  try {
    return storage().getString(KEY) ?? '';
  } catch {
    return '';
  }
}

export function setUserName(name: string): void {
  try {
    storage().set(KEY, name.trim());
  } catch {}
}

export function getMyMemberId(groupId: string): string {
  try {
    return storage().getString(`my_member_${groupId}`) ?? '';
  } catch {
    return '';
  }
}

export function setMyMemberId(groupId: string, memberId: string): void {
  try {
    storage().set(`my_member_${groupId}`, memberId);
  } catch {}
}
