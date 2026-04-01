import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/color';
import { useRealm } from '../../realm/RealmContext';
import { calculateBalances } from '../../utils/balanceCalculator';

export default function HomeScreen() {
  const realm = useRealm();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    const results = realm.objects('Group');
    const payments = realm.objects('Payment');
    const update = () => setGroups([...results]);
    update();
    results.addListener(update);
    payments.addListener(update);
    return () => {
      results.removeAllListeners();
      payments.removeAllListeners();
    };
  }, [realm]);

  const getMeta = (groupId: any) => {
    const memberResults = realm.objects('Member').filtered('groupId == $0', groupId);
    const expenseResults = realm.objects('Expense').filtered('groupId == $0', groupId);
    const splitResults = realm.objects('ExpenseSplit');
    const paymentResults = realm.objects('Payment').filtered('groupId == $0', groupId);

    const totalSpent = expenseResults.reduce((sum: number, e: any) => sum + e.amount, 0);

    // Group is settled if all net balances are within rounding tolerance
    const balances = calculateBalances(memberResults, expenseResults, splitResults, paymentResults);
    const isSettled = balances.every(b => Math.abs(b.netBalance) <= 0.01);

    return { memberCount: memberResults.length, totalSpent, isSettled };
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>Good evening</Text>
        <Text style={styles.title}>My Groups</Text>

        <View style={styles.headerBtns}>
          <TouchableOpacity
            style={styles.importBtn}
            onPress={() => navigation.navigate('ImportGroup')}
          >
            <Text style={styles.importText}>⬡</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('CreateGroup')}
          >
            <Text style={styles.addText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={groups}
        keyExtractor={item => item._id.toHexString()}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No groups yet. Create one!</Text>
          </View>
        }
        renderItem={({ item }) => {
          const { memberCount, totalSpent, isSettled } = getMeta(item._id);
          return (
            <TouchableOpacity
              style={styles.groupCard}
              onPress={() =>
                navigation.navigate('Group', { groupId: item._id.toHexString() })
              }
            >
              <View style={styles.cardLeft}>
                <Text style={styles.groupName}>{item.name}</Text>
                <Text style={styles.groupMeta}>
                  {memberCount} {memberCount === 1 ? 'member' : 'members'} · ₹{totalSpent.toFixed(0)} spent
                </Text>
              </View>

              <View style={[styles.badge, isSettled ? styles.badgeSettled : styles.badgePending]}>
                <Text style={[styles.badgeText, isSettled ? styles.badgeTextSettled : styles.badgeTextPending]}>
                  {isSettled ? 'Settled' : 'Pending'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  subtitle: {
    color: colors.text2,
    fontSize: 12,
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  headerBtns: {
    position: 'absolute',
    right: 20,
    top: 0,
    flexDirection: 'row',
    gap: 8,
  },
  importBtn: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  importText: {
    color: colors.text2,
    fontSize: 18,
  },
  addBtn: {
    backgroundColor: colors.accent,
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addText: {
    color: '#000',
    fontSize: 22,
  },
  groupCard: {
    backgroundColor: colors.surface2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flex: 1,
    marginRight: 12,
  },
  groupName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  groupMeta: {
    color: colors.text2,
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeSettled: {
    backgroundColor: 'rgba(0,229,160,0.1)',
    borderColor: colors.accent,
  },
  badgePending: {
    backgroundColor: 'rgba(255,74,107,0.1)',
    borderColor: colors.danger,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextSettled: {
    color: colors.accent,
  },
  badgeTextPending: {
    color: colors.danger,
  },
  emptyState: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.text2,
    fontSize: 14,
  },
});
