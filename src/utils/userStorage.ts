import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({ id: 'baagam-storage' });
const USER_NAME_KEY = 'user_name';

export function getUserName(): string {
  return storage.getString(USER_NAME_KEY) ?? '';
}

export function setUserName(name: string): void {
  storage.set(USER_NAME_KEY, name.trim());
}

export function getMyMemberId(groupId: string): string {
  return storage.getString(`my_member_${groupId}`) ?? '';
}

export function setMyMemberId(groupId: string, memberId: string): void {
  storage.set(`my_member_${groupId}`, memberId);
}
