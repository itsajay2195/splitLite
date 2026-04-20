import Realm from 'realm';

export type ActivityType =
  | 'expense_added'
  | 'expense_edited'
  | 'expense_deleted'
  | 'payment_marked'
  | 'member_added'
  | 'member_removed';

// Must be called inside an existing realm.write() block
export function logActivity(
  realm: Realm,
  groupId: Realm.BSON.ObjectId,
  type: ActivityType,
  description: string,
) {
  realm.create('ActivityLog', {
    _id: new Realm.BSON.ObjectId(),
    groupId,
    type,
    description,
    date: new Date(),
  });
}
