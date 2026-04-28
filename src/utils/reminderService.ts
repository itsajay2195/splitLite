import notifee, { AndroidImportance, TriggerType } from '@notifee/react-native';
import Realm from 'realm';
import { calculateBalances } from './balanceCalculator';

const CHANNEL_ID = 'baagam_reminders';
const REMINDER_AFTER_DAYS = 3;

// Stable notification ID per group (notifee requires string)
const notifId = (groupId: Realm.BSON.ObjectId) => `grp_${groupId.toHexString().slice(0, 16)}`;

async function ensureChannel() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Settlement Reminders',
    importance: AndroidImportance.DEFAULT,
  });
}

export async function requestNotificationPermission() {
  await notifee.requestPermission();
}

export async function scheduleGroupReminders(realm: Realm) {
  await ensureChannel();

  const groups = realm.objects('Group');

  for (const g of groups as any) {
    const gId: Realm.BSON.ObjectId = g._id;
    const id = notifId(gId);

    const members = realm.objects('Member').filtered('groupId == $0', gId);
    const expenses = realm.objects('Expense').filtered('groupId == $0', gId);
    const splits = realm.objects('ExpenseSplit');
    const payments = realm.objects('Payment').filtered('groupId == $0', gId);

    const balances = calculateBalances(members, expenses, splits, payments);
    const isSettled = balances.every(b => Math.abs(b.netBalance) <= 0.01);

    if (isSettled || expenses.length === 0) {
      await notifee.cancelNotification(id);
      continue;
    }

    // Find last activity date for this group
    const lastActivity: any = realm
      .objects('ActivityLog')
      .filtered('groupId == $0', gId)
      .sorted('date', true)[0];

    const lastDate: Date = lastActivity?.date ?? (expenses[0] as any).date ?? new Date();
    const daysSince = (Date.now() - new Date(lastDate).getTime()) / 86400000;

    const totalUnsettled = balances
      .filter(b => b.netBalance > 0.01)
      .reduce((s, b) => s + b.netBalance, 0);

    const fireAt = daysSince >= REMINDER_AFTER_DAYS
      ? Date.now() + 60 * 1000       // already overdue — fire in 1 min
      : new Date(lastDate).getTime() + REMINDER_AFTER_DAYS * 86400000;

    await notifee.createTriggerNotification(
      {
        id,
        title: `💸 ${g.name}`,
        body: `₹${totalUnsettled.toFixed(0)} still unsettled — time to settle up!`,
        android: { channelId: CHANNEL_ID, pressAction: { id: 'default' } },
      },
      { type: TriggerType.TIMESTAMP, timestamp: fireAt },
    );
  }
}

export async function cancelGroupReminder(groupId: Realm.BSON.ObjectId) {
  await notifee.cancelNotification(notifId(groupId));
}
