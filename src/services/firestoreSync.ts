/**
 * Firestore sync layer — mirrors Realm writes to Firestore for logged-in users.
 * All functions are fire-and-forget: they run async without blocking Realm ops.
 * Guest users (not logged in) are never synced — their data stays local only.
 */

import Realm from 'realm';
import { db } from '../firebase/firestore';
import { getCurrentUser } from '../utils/firebaseAuth';

function user() {
  return getCurrentUser();
}

function groupRef(groupId: string) {
  return db.collection('groups').doc(groupId);
}

async function saveToUserGroups(uid: string, groupId: string, name: string) {
  await db.collection('users').doc(uid).collection('groups').doc(groupId).set({
    name,
    visitedAt: new Date().toISOString(),
  });
}

export function syncGroupCreated(realm: Realm, groupId: Realm.BSON.ObjectId) {
  const u = user();
  if (!u) return;

  const gId = groupId.toHexString();
  const group: any = realm.objectForPrimaryKey('Group', groupId);
  const members: any[] = [...realm.objects('Member').filtered('groupId == $0', groupId)];

  db.runTransaction(async () => {
    await groupRef(gId).set({
      name: group.name,
      createdAt: group.createdAt,
      createdBy: u.uid,
    });
    for (const m of members) {
      await groupRef(gId).collection('members').doc(m._id.toHexString()).set({
        name: m.name,
        upiId: m.upiId ?? null,
        createdAt: new Date(),
      });
    }
    await saveToUserGroups(u.uid, gId, group.name);
  }).catch(() => {});
}

export function syncGroupVisited(groupId: string, groupName: string) {
  const u = user();
  if (!u) return;
  saveToUserGroups(u.uid, groupId, groupName).catch(() => {});
}

export function syncGroupRenamed(groupId: string, name: string) {
  const u = user();
  if (!u) return;
  groupRef(groupId).update({ name }).catch(() => {});
  saveToUserGroups(u.uid, groupId, name).catch(() => {});
}

export function syncGroupDeleted(groupId: string) {
  const u = user();
  if (!u) return;
  groupRef(groupId).delete().catch(() => {});
  db.collection('users').doc(u.uid).collection('groups').doc(groupId).delete().catch(() => {});
}

export function syncMemberAdded(realm: Realm, groupId: Realm.BSON.ObjectId, memberId: Realm.BSON.ObjectId) {
  const u = user();
  if (!u) return;
  const m: any = realm.objectForPrimaryKey('Member', memberId);
  if (!m) return;
  groupRef(groupId.toHexString()).collection('members').doc(memberId.toHexString()).set({
    name: m.name,
    upiId: m.upiId ?? null,
    createdAt: new Date(),
  }).catch(() => {});
}

export function syncMemberRemoved(groupId: string, memberId: string) {
  const u = user();
  if (!u) return;
  groupRef(groupId).collection('members').doc(memberId).delete().catch(() => {});
}

export function syncExpenseAdded(
  realm: Realm,
  groupId: Realm.BSON.ObjectId,
  expenseId: Realm.BSON.ObjectId,
) {
  const u = user();
  if (!u) return;

  const gId = groupId.toHexString();
  const eId = expenseId.toHexString();
  const e: any = realm.objectForPrimaryKey('Expense', expenseId);
  if (!e) return;

  const splits: any[] = [...realm.objects('ExpenseSplit').filtered('expenseId == $0', expenseId)];
  const splitsMap: Record<string, number> = {};
  splits.forEach(s => { splitsMap[s.memberId.toHexString()] = s.amount; });

  groupRef(gId).collection('expenses').doc(eId).set({
    description: e.description,
    amount: e.amount,
    paidByMemberId: e.paidByMemberId.toHexString(),
    date: e.date,
    category: e.category ?? null,
    splitAmong: splits.map(s => s.memberId.toHexString()),
    splits: Object.keys(splitsMap).length > 0 ? splitsMap : null,
  }).catch(() => {});
}

export function syncExpenseUpdated(
  realm: Realm,
  groupId: Realm.BSON.ObjectId,
  expenseId: Realm.BSON.ObjectId,
) {
  syncExpenseAdded(realm, groupId, expenseId);
}

export function syncExpenseDeleted(groupId: string, expenseId: string) {
  const u = user();
  if (!u) return;
  groupRef(groupId).collection('expenses').doc(expenseId).delete().catch(() => {});
}

export function syncPaymentAdded(
  realm: Realm,
  groupId: Realm.BSON.ObjectId,
  paymentId: Realm.BSON.ObjectId,
) {
  const u = user();
  if (!u) return;

  const p: any = realm.objectForPrimaryKey('Payment', paymentId);
  if (!p) return;

  groupRef(groupId.toHexString()).collection('payments').doc(paymentId.toHexString()).set({
    fromMemberId: p.fromMemberId.toHexString(),
    toMemberId: p.toMemberId.toHexString(),
    amount: p.amount,
    date: p.date,
  }).catch(() => {});
}
