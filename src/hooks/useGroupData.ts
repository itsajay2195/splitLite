import { useEffect, useState } from 'react';
import Realm from 'realm';
import { db } from '../firebase/firestore';
import { getCurrentUser } from '../utils/firebaseAuth';
import type { Group, Member, Expense, Payment, Activity } from '../types';

function toDate(val: any): Date {
  if (!val) return new Date();
  if (val.toDate) return val.toDate();
  return new Date(val);
}

interface GroupData {
  group: Group | null;
  members: Member[];
  expenses: Expense[];
  payments: Payment[];
  activities: Activity[];
  notFound: boolean;
}

export function useGroupData(groupId: string, realm?: Realm | null): GroupData {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!groupId) return;

    // Guest mode: read from Realm with live listeners
    if (!getCurrentUser() && realm) {
      const gId = new Realm.BSON.ObjectId(groupId);
      const groupObj: any = realm.objectForPrimaryKey('Group', gId);
      if (!groupObj) { setNotFound(true); return; }

      setGroup({ id: groupId, name: groupObj.name, createdAt: groupObj.createdAt });

      const memberResults = realm.objects('Member').filtered('groupId == $0', gId);
      const expenseResults = realm.objects('Expense').filtered('groupId == $0', gId);
      const splitResults = realm.objects('ExpenseSplit');
      const paymentResults = realm.objects('Payment').filtered('groupId == $0', gId);
      const activityResults = realm.objects('ActivityLog').filtered('groupId == $0', gId);

      const readMembers = () => setMembers(([...memberResults] as any[]).map(m => ({
        id: m._id.toHexString(),
        name: m.name,
        upiId: m.upiId ?? undefined,
        createdAt: m.createdAt ?? new Date(),
      })));

      const readExpenses = () => setExpenses(([...expenseResults] as any[]).map(e => {
        const eSplits = ([...splitResults.filtered('expenseId == $0', e._id)] as any[]);
        const splitsMap: Record<string, number> = {};
        eSplits.forEach(s => { splitsMap[s.memberId.toHexString()] = s.amount; });
        return {
          id: e._id.toHexString(),
          description: e.description,
          amount: e.amount,
          paidByMemberId: e.paidByMemberId.toHexString(),
          date: e.date,
          category: e.category ?? undefined,
          splitAmong: eSplits.map(s => s.memberId.toHexString()),
          splits: Object.keys(splitsMap).length > 0 ? splitsMap : undefined,
        };
      }));

      const readPayments = () => setPayments(([...paymentResults] as any[]).map(p => ({
        id: p._id.toHexString(),
        fromMemberId: p.fromMemberId.toHexString(),
        toMemberId: p.toMemberId.toHexString(),
        amount: p.amount,
        date: p.date,
      })));

      const readActivities = () => setActivities(
        ([...activityResults] as any[])
          .map(a => ({ id: a._id.toHexString(), type: a.type, text: a.description, createdAt: a.date }))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 30),
      );

      readMembers();
      readExpenses();
      readPayments();
      readActivities();

      memberResults.addListener(readMembers);
      expenseResults.addListener(() => { readExpenses(); readActivities(); });
      paymentResults.addListener(readPayments);
      activityResults.addListener(readActivities);

      return () => {
        memberResults.removeAllListeners();
        expenseResults.removeAllListeners();
        paymentResults.removeAllListeners();
        activityResults.removeAllListeners();
      };
    }

    // Logged-in mode: real-time Firestore listeners
    const unsubs: (() => void)[] = [];

    unsubs.push(
      db.collection('groups').doc(groupId).onSnapshot(snap => {
        if (!snap.exists) { setNotFound(true); return; }
        const d = snap.data()!;
        setGroup({ id: snap.id, name: d.name, createdAt: toDate(d.createdAt), createdBy: d.createdBy });
      }),
    );

    unsubs.push(
      db.collection('groups').doc(groupId).collection('members').onSnapshot(snap => {
        setMembers(snap.docs.map(d => ({
          id: d.id,
          name: d.data().name,
          upiId: d.data().upiId ?? undefined,
          createdAt: toDate(d.data().createdAt),
        })));
      }),
    );

    unsubs.push(
      db.collection('groups').doc(groupId).collection('expenses').onSnapshot(snap => {
        setExpenses(snap.docs.map(d => ({
          id: d.id,
          description: d.data().description,
          amount: d.data().amount,
          paidByMemberId: d.data().paidByMemberId,
          date: toDate(d.data().date),
          category: d.data().category ?? undefined,
          splitAmong: d.data().splitAmong ?? [],
          splits: d.data().splits ?? undefined,
        })));
      }),
    );

    unsubs.push(
      db.collection('groups').doc(groupId).collection('payments').onSnapshot(snap => {
        setPayments(snap.docs.map(d => ({
          id: d.id,
          fromMemberId: d.data().fromMemberId,
          toMemberId: d.data().toMemberId,
          amount: d.data().amount,
          date: toDate(d.data().date),
        })));
      }),
    );

    unsubs.push(
      db.collection('groups').doc(groupId).collection('activities').onSnapshot(snap => {
        setActivities(
          snap.docs
            .map(d => ({
              id: d.id,
              type: d.data().type,
              text: d.data().text ?? d.data().description ?? '',
              createdAt: toDate(d.data().createdAt ?? d.data().date),
            }))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 30),
        );
      }),
    );

    return () => unsubs.forEach(u => u());
  }, [groupId, realm]);

  return { group, members, expenses, payments, activities, notFound };
}
