import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/color';
import { useRealm } from '../../realm/RealmContext';
import { calculateBalances } from '../../utils/balanceCalculator';
import { useAlert } from '../../components/AlertProvider';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { requestNotificationPermission } from '../../utils/reminderService';
import { getCurrentUser, onAuthStateChanged, signOut, type FirebaseUser } from '../../utils/firebaseAuth';
import { syncGroupDeleted } from '../../services/firestoreSync';
import { db } from '../../firebase/firestore';
import { timeAgo } from '../../utils/timeAgo';

export default function HomeScreen() {
  const realm = useRealm();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(() => getCurrentUser());
  // Logged-in: groups from Firestore
  const [cloudGroups, setCloudGroups] = useState<{ id: string; name: string; visitedAt?: string }[]>([]);
  // Guest: groups from Realm
  const [realmGroups, setRealmGroups] = useState<any[]>([]);

  useEffect(() => { requestNotificationPermission(); }, []);

  useEffect(() => {
    return onAuthStateChanged(user => setFirebaseUser(user));
  }, []);

  // Firestore listener — only for logged-in users
  useEffect(() => {
    if (!firebaseUser) { setCloudGroups([]); return; }
    const unsub = db
      .collection('users').doc(firebaseUser.uid).collection('groups')
      .orderBy('visitedAt', 'desc')
      .onSnapshot(snap => {
        setCloudGroups(snap.docs.map(d => ({ id: d.id, name: d.data().name as string, visitedAt: d.data().visitedAt as string | undefined })));
      }, () => {});
    return unsub;
  }, [firebaseUser]);

  // Realm listener — always active (needed for guest mode + delete)
  useEffect(() => {
    const results = realm.objects('Group');
    const payments = realm.objects('Payment');
    const expenses = realm.objects('Expense');
    const update = () => setRealmGroups([...results]);
    update();
    results.addListener(update);
    payments.addListener(update);
    expenses.addListener(update);
    return () => {
      results.removeAllListeners();
      payments.removeAllListeners();
      expenses.removeAllListeners();
    };
  }, [realm]);

  const getRealmMeta = (groupId: any) => {
    const memberResults = realm.objects('Member').filtered('groupId == $0', groupId);
    const expenseResults = realm.objects('Expense').filtered('groupId == $0', groupId);
    const splitResults = realm.objects('ExpenseSplit');
    const paymentResults = realm.objects('Payment').filtered('groupId == $0', groupId);
    const totalSpent = expenseResults.reduce((sum: number, e: any) => sum + e.amount, 0);
    const balances = calculateBalances(memberResults, expenseResults, splitResults, paymentResults);
    const isSettled = balances.every(b => Math.abs(b.netBalance) <= 0.01);
    return { memberCount: memberResults.length, totalSpent, isSettled };
  };

  const handleDeleteRealmGroup = (group: any) => {
    showAlert({
      title: 'Delete Group?',
      message: `"${group.name}" and all its expenses will be permanently deleted.`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => {
            const gId = group._id;
            realm.write(() => {
              const expenses = realm.objects('Expense').filtered('groupId == $0', gId);
              expenses.forEach((e: any) => realm.delete(realm.objects('ExpenseSplit').filtered('expenseId == $0', e._id)));
              realm.delete(expenses);
              realm.delete(realm.objects('Payment').filtered('groupId == $0', gId));
              realm.delete(realm.objects('Member').filtered('groupId == $0', gId));
              realm.delete(realm.objects('ActivityLog').filtered('groupId == $0', gId));
              const g = realm.objectForPrimaryKey('Group', gId);
              if (g) realm.delete(g);
            });
            syncGroupDeleted(gId.toHexString());
          },
        },
      ],
    });
  };

  const handleDeleteCloudGroup = (group: { id: string; name: string }) => {
    showAlert({
      title: 'Delete Group?',
      message: `"${group.name}" will be removed from your groups.`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => syncGroupDeleted(group.id),
        },
      ],
    });
  };

  const handleProfilePress = () => {
    if (!firebaseUser) return;
    showAlert({
      title: firebaseUser.displayName ?? 'Account',
      message: firebaseUser.email ?? '',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out', style: 'destructive',
          onPress: async () => { await signOut(); navigation.replace('Login'); },
        },
      ],
    });
  };

  // Logged-in: show Firestore groups only
  // Guest: show Realm groups only
  const isLoggedIn = !!firebaseUser;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.subtitle}>
            {firebaseUser ? `Hey, ${firebaseUser.displayName?.split(' ')[0]}` : 'Good day'}
          </Text>
          <Text style={styles.title}>My Groups</Text>
        </View>
        <View style={styles.headerBtns}>
          {firebaseUser && (
            <TouchableOpacity style={styles.iconBtn} onPress={handleProfilePress}>
              <Ionicons name="person-circle-outline" size={26} color={colors.text2} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('CreateGroup')}>
            <Ionicons name="add" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {isLoggedIn ? (
        // ── Logged-in: Firestore groups ──────────────────────────────
        <FlatList
          data={cloudGroups}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No groups yet. Create one!</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.groupCard}
              onPress={() => navigation.navigate('Group', { groupId: item.id })}
              onLongPress={() => handleDeleteCloudGroup(item)}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.groupName}>{item.name}</Text>
                {item.visitedAt && (
                  <Text style={styles.groupMeta}>Last opened {timeAgo(new Date(item.visitedAt))}</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.text3} />
            </TouchableOpacity>
          )}
        />
      ) : (
        // ── Guest: Realm groups ──────────────────────────────────────
        <FlatList
          data={realmGroups}
          keyExtractor={item => item._id.toHexString()}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No groups yet. Create one!</Text>
            </View>
          }
          renderItem={({ item }) => {
            const { memberCount, totalSpent, isSettled } = getRealmMeta(item._id);
            return (
              <TouchableOpacity
                style={styles.groupCard}
                onPress={() => navigation.navigate('Group', { groupId: item._id.toHexString() })}
                onLongPress={() => handleDeleteRealmGroup(item)}
              >
                <View style={styles.cardLeft}>
                  <Text style={styles.groupName}>{item.name}</Text>
                  <Text style={styles.groupMeta}>
                    {memberCount} {memberCount === 1 ? 'member' : 'members'} · ₹{totalSpent.toFixed(0)} spent
                  </Text>
                </View>
                <View style={[styles.statusBadge, isSettled ? styles.statusSettled : styles.statusPending]}>
                  <Text style={[styles.statusText, isSettled ? styles.statusTextSettled : styles.statusTextPending]}>
                    {isSettled ? 'Settled' : 'Pending'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  subtitle: { color: colors.text2, fontSize: 14, marginBottom: 2 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  headerBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  addBtn: { backgroundColor: colors.accent, width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  groupCard: { backgroundColor: colors.surface2, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' },
  cardLeft: { flex: 1 },
  groupName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  groupMeta: { color: colors.text3, fontSize: 12, marginTop: 3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusSettled: { backgroundColor: 'rgba(0,229,160,0.12)', borderColor: colors.accent },
  statusPending: { backgroundColor: 'rgba(255,74,107,0.12)', borderColor: colors.danger },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextSettled: { color: colors.accent },
  statusTextPending: { color: colors.danger },
  emptyState: { paddingTop: 60, alignItems: 'center' },
  emptyText: { color: colors.text3, fontSize: 14 },
});
