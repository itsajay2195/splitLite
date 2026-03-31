import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

import Realm from 'realm';
import { colors } from '../../theme/color';
import { calculateBalances } from '../../utils/balanceCalculator';
import { simplifyDebts } from '../../utils/debtSimplifier';
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
  const [settlements, setSettlements] = useState<any[]>([]);

  useEffect(() => {
    const objectId = new Realm.BSON.ObjectId(groupId);

    const groupData = realm.objectForPrimaryKey('Group', objectId);
    const memberResults = realm.objects('Member').filtered('groupId == $0', objectId);
    const expenseResults = realm.objects('Expense').filtered('groupId == $0', objectId);
    const splitResults = realm.objects('ExpenseSplit');

    const refresh = () => {
      const newBalances = calculateBalances(memberResults, expenseResults, splitResults);
      setBalances(newBalances);
      setSettlements(
        simplifyDebts(
          newBalances.map(b => ({ memberId: b.memberId, name: b.name, net: b.netBalance })),
        ),
      );
      setExpenses([...expenseResults].sort((a, b) => b.date - a.date));
    };

    setGroup(groupData);
    setMembers([...memberResults]);
    refresh();

    expenseResults.addListener(refresh);

    return () => {
      expenseResults.removeAllListeners();
    };
  }, [groupId, realm]);

  if (!group) return null;

  const getMemberName = (memberId: Realm.BSON.ObjectId) => {
    const member = members.find(m => m._id.toHexString() === memberId.toHexString());
    return member ? member.name : 'Unknown';
  };

  const getMember = (memberId: string) =>
    members.find(m => m._id.toHexString() === memberId);

  const handleUpiPay = (settlement: any) => {
    const toMember = getMember(settlement.to);
    if (!toMember?.upiId) return;

    const upiUrl =
      `upi://pay?pa=${encodeURIComponent(toMember.upiId)}` +
      `&pn=${encodeURIComponent(toMember.name)}` +
      `&am=${settlement.amount.toFixed(2)}` +
      `&cu=INR` +
      `&tn=${encodeURIComponent('SplitLite settlement')}`;

    Linking.openURL(upiUrl).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Groups</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>{group.name}</Text>
              <Text style={styles.subtitle}>
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.qrBtn}
              onPress={() => navigation.navigate('ShareGroup', { groupId })}
            >
              <Text style={styles.qrBtnText}>⬡ Share</Text>
            </TouchableOpacity>
          </View>
        </View>

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
        <Text style={styles.sectionTitle}>Balances</Text>
        <View style={styles.section}>
          {balances.map(bal => (
            <View key={bal.memberId} style={styles.balanceCard}>
              <Text style={styles.balanceName}>{bal.name}</Text>
              <Text
                style={[
                  styles.balanceAmount,
                  {
                    color:
                      bal.netBalance > 0
                        ? colors.accent
                        : bal.netBalance < 0
                        ? colors.danger
                        : colors.text2,
                  },
                ]}
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

        {/* Settlement Suggestions */}
        {settlements.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Settle Up</Text>
            <View style={styles.section}>
              {settlements.map((s, i) => {
                const toMember = getMember(s.to);
                const hasUpi = !!toMember?.upiId;
                return (
                  <View key={i} style={styles.settlementCard}>
                    <View style={styles.settlementLeft}>
                      <Text style={styles.settlementText}>
                        <Text style={{ color: colors.danger }}>{s.fromName}</Text>
                        <Text style={{ color: colors.text2 }}> pays </Text>
                        <Text style={{ color: colors.accent }}>{s.toName}</Text>
                      </Text>
                      <Text style={styles.settlementAmount}>₹{s.amount.toFixed(2)}</Text>
                    </View>
                    {hasUpi && (
                      <TouchableOpacity
                        style={styles.upiBtn}
                        onPress={() => handleUpiPay(s)}
                      >
                        <Text style={styles.upiBtnText}>Pay via UPI</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Expenses */}
        <Text style={styles.sectionTitle}>
          Expenses{expenses.length > 0 ? ` (${expenses.length})` : ''}
        </Text>

        {expenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No expenses yet</Text>
          </View>
        ) : (
          <View style={styles.section}>
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
          </View>
        )}
      </ScrollView>

      {/* Add Expense Button — always pinned to bottom */}
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
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  qrBtn: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
  },
  qrBtnText: {
    color: colors.text2,
    fontSize: 13,
    fontWeight: '600',
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
  sectionTitle: {
    color: colors.text2,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
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
  balanceAmount: {
    fontWeight: '600',
  },
  settlementCard: {
    backgroundColor: colors.surface2,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settlementLeft: {
    flex: 1,
  },
  settlementText: {
    fontSize: 14,
    fontWeight: '600',
  },
  settlementAmount: {
    color: colors.text,
    fontSize: 13,
    marginTop: 2,
    fontWeight: '700',
  },
  upiBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 10,
  },
  upiBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  expenseCard: {
    backgroundColor: colors.surface2,
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
    marginBottom: 24,
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
