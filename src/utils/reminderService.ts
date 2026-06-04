import notifee, { AndroidImportance } from '@notifee/react-native';

const CHANNEL_ID = 'baagam_reminders';

async function ensureChannel() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Settlement Reminders',
    importance: AndroidImportance.DEFAULT,
  });
}

export async function requestNotificationPermission() {
  await ensureChannel();
  await notifee.requestPermission();
}
