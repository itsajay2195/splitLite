import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

import Realm from 'realm';
import { colors } from '../../theme/color';
import { calculateBalances } from '../../utils/balanceCalculator';
import { useRealm } from '../../realm/RealmContext';

export default function GroupScreen() {
  const realm = useRealm();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { groupId } = route.params;

  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  useEffect(() => {
    const objectId = new Realm.BSON.ObjectId(groupId);

    const groupData = realm.objectForPrimaryKey('Group', objectId);
    const memberResults = realm.objects('Member').filtered('groupId == $0', objectId);
    const expenseResults = realm.objects('Expense').filtered('groupId == $0', objectId);
    const splitResults = realm.objects('ExpenseSplit');

    setGroup(groupData);
    setMembers([...memberResults]);
    setExpenses([...expenseResults].sort((a, b) => b.date - a.date));
    setBalances(calculateBalances(memberResults, expenseResults, splitResults));

    const onExpenseChange = () => {
      setExpenses([...expenseResults].sort((a, b) => b.date - a.date));
      setBalances(calculateBalances(memberResults, expenseResults, splitResults));
    };

    expenseResults.addListener(onExpenseChange);

    return () => {
      expenseResults.removeAllListeners();
    };
  }, [groupId, realm]);

  if (!group) return null;

  const getMemberName = (memberId: Realm.BSON.ObjectId) => {
    const member = members.find(m => m._id.toHexString() === memberId.toHexString());
    return member ? member.name : 'Unknown';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Groups</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{group.name}</Text>
        <Text style={styles.subtitle}>{members.length} {members.length === 1 ? 'member' : 'members'}</Text>
      </View>

      <FlatList
        data={[]}
        keyExtractor={() => ''}
        renderItem={null}
        ListHeaderComponent={
          <>
            {/* Members Row */}
            <View style={styles.membersRow}>
              {members.map(member => (
                <View key={member._id.toHexString()} style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>

            {/* Balances */}
            <View style={styles.section}>
              {balances.map(bal => (
                <View key={bal.memberId} style={styles.balanceCard}>
                  <Text style={styles.balanceName}>{bal.name}</Text>
                  <Text
                    style={{
                      color:
                        bal.netBalance > 0
                          ? colors.accent
                          : bal.netBalance < 0
                          ? colors.danger
                          : colors.text2,
                      fontWeight: '600',
                    }}
                  >
                    {bal.netBalance > 0
                      ? `Gets ₹${bal.netBalance.toFixed(2)}`
                      : bal.netBalance < 0
                      ? `Owes ₹${Math.abs(bal.netBalance).toFixed(2)}`
                      : 'Settled'}
                  </Text>
                </View>
              ))}
            </View>

            {/* Expenses Header */}
            <Text style={styles.sectionTitle}>
              Expenses {expenses.length > 0 ? `(${expenses.length})` : ''}
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No expenses yet</Text>
          </View>
        }
      />

      {/* Expense List */}
      {expenses.map(expense => (
        <View key={expense._id.toHexString()} style={styles.expenseCard}>
          <View style={styles.expenseLeft}>
            <Text style={styles.expenseDesc}>
              {expense.description || 'Expense'}
            </Text>
            <Text style={styles.expenseMeta}>
              Paid by {getMemberName(expense.paidByMemberId)} ·{' '}
              {new Date(expense.date).toLocaleDateString()}
            </Text>
          </View>
          <Text style={styles.expenseAmount}>₹{expense.amount.toFixed(2)}</Text>
        </View>
      ))}

      {/* Add Expense Button */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => navigation.navigate('AddExpense', { groupId })}
      >
        <Text style={styles.addText}>+ Add Expense</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  back: {
    color: colors.text2,
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.text2,
    fontSize: 12,
    marginTop: 4,
  },
  membersRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: {
    color: colors.text,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  balanceCard: {
    backgroundColor: colors.surface2,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceName: {
    color: colors.text,
    fontWeight: '600',
  },
  sectionTitle: {
    color: colors.text2,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  expenseCard: {
    backgroundColor: colors.surface2,
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseLeft: {
    flex: 1,
  },
  expenseDesc: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  expenseMeta: {
    color: colors.text2,
    fontSize: 12,
    marginTop: 2,
  },
  expenseAmount: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 12,
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.text3,
  },
  addBtn: {
    backgroundColor: colors.accent,
    margin: 20,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  addText: {
    color: '#000',
    fontWeight: '700',
  },
});
