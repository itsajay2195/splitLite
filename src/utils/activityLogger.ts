import { db } from '../firebase/firestore';
import { getCurrentUser } from './firebaseAuth';

export type ActivityType =
  | 'expense_added'
  | 'expense_edited'
  | 'expense_deleted'
  | 'payment_marked'
  | 'member_added'
  | 'member_removed';

export function logActivity(groupId: string, type: ActivityType, text: string): void {
  if (!getCurrentUser()) return;
  db.collection('groups').doc(groupId).collection('activities').add({
    type,
    text,
    createdAt: new Date(),
  }).catch(() => {});
}
