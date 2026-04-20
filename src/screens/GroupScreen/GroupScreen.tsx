import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  SectionList,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

import Realm from 'realm';
import { colors } from '../../theme/color';
import { calculateBalances } from '../../utils/balanceCalculator';
import { simplifyDebts } from '../../utils/debtSimplifier';
import { useRealm } from '../../realm/RealmContext';
import ScreenHeader from '../../components/ScreenHeader';
import { useAlert } from '../../components/AlertProvider';

const CATEGORY_EMOJI: Record<string, string> = {
  food: '🍔',
  travel: '✈️',
  rent: '🏠',
  fun: '🎉',
  grocery: '🛒',
  transport: '🚗',
  health: '💊',
  other: '📦',
};

type SectionData =
  | { type: 'members' }
  | { type: 'balance'; memberId: string; name: string; netBalance: number }
  | {
      type: 'settlement';
      from: string;
      fromName: string;
      to: string;
      toName: string;
      amount: number;
    }
  | {
      type: 'expense';
      _id: any;
      description: string;
      paidByMemberId: any;
      amount: number;
      date: Date;
      category?: string;
    }
  | { type: 'empty' };

export default function GroupScreen() {
  const realm = useRealm();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { showAlert } = useAlert();
  const { groupId } = route.params;

  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);

  useEffect(() => {
    const objectId = new Realm.BSON.ObjectId(groupId);

    const groupData = realm.objectForPrimaryKey('Group', objectId);
    const memberResults = realm
      .objects('Member')
      .filtered('groupId == $0', objectId);
    const expenseResults = realm
      .objects('Expense')
      .filtered('groupId == $0', objectId);
    const splitResults = realm.objects('ExpenseSplit');
    const paymentResults = realm
      .objects('Payment')
      .filtered('groupId == $0', objectId);

    const refresh = () => {
      const newBalances = calculateBalances(
        memberResults,
        expenseResults,
        splitResults,
        paymentResults,
      );
      setBalances(newBalances);
      setSettlements(
        simplifyDebts(
          newBalances.map(b => ({
            memberId: b.memberId,
            name: b.name,
            net: b.netBalance,
          })),
        ),
      );
      setExpenses(
        [...expenseResults].sort((a: any, b: any) => b.date - a.date),
      );
    };

    setGroup(groupData);
    setMembers([...memberResults]);
    refresh();

    expenseResults.addListener(refresh);
    paymentResults.addListener(refresh);

    return () => {
      expenseResults.removeAllListeners();
      paymentResults.removeAllListeners();
    };
  }, [groupId, realm]);

  const handleExpenseTap = (expense: any) => {
    showAlert({
      title: expense.description || 'Expense',
      message: `₹${expense.amount.toFixed(2)} · paid by ${getMemberName(expense.paidByMemberId)}`,
      buttons: [
        {
          text: 'Edit',
          style: 'default',
          onPress: () =>
            navigation.navigate('AddExpense', {
              groupId,
              expenseId: expense._id.toHexString(),
            }),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            realm.write(() => {
              const splits = realm
                .objects('ExpenseSplit')
                .filtered('expenseId == $0', expense._id);
              realm.delete(splits);
              const exp = realm.objectForPrimaryKey('Expense', expense._id);
              if (exp) realm.delete(exp);
            });
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    });
  };

  const markPaid = (settlement: any) => {
    showAlert({
      title: 'Mark as Paid?',
      message: `Record that ${settlement.fromName} paid ${
        settlement.toName
      } ₹${settlement.amount.toFixed(2)}?`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          style: 'default',
          onPress: () => {
            realm.write(() => {
              realm.create('Payment', {
                _id: new Realm.BSON.ObjectId(),
                groupId: new Realm.BSON.ObjectId(groupId),
                fromMemberId: new Realm.BSON.ObjectId(settlement.from),
                toMemberId: new Realm.BSON.ObjectId(settlement.to),
                amount: settlement.amount,
                date: new Date(),
              });
            });
          },
        },
      ],
    });
  };

  const getMemberName = (memberId: Realm.BSON.ObjectId) => {
    const member = members.find(
      m => m._id.toHexString() === memberId.toHexString(),
    );
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

  const sections = useMemo(() => {
    const result: { key: string; title: string; data: SectionData[] }[] = [
      {
        key: 'members',
        title: 'Members',
        data: [{ type: 'members' }],
      },
      {
        key: 'balances',
        title: 'Balances',
        data: balances.map(b => ({ type: 'balance' as const, ...b })),
      },
    ];

    if (settlements.length > 0) {
      result.push({
        key: 'settlements',
        title: 'Settle Up',
        data: settlements.map(s => ({ type: 'settlement' as const, ...s })),
      });
    }

    result.push({
      key: 'expenses',
      title: `Expenses${expenses.length > 0 ? ` (${expenses.length})` : ''}`,
      data:
        expenses.length > 0
          ? expenses.map(e => ({ type: 'expense' as const, ...e }))
          : [{ type: 'empty' as const }],
    });

    return result;
  }, [balances, settlements, expenses]);

  if (!group) return null;

  const renderItem = ({ item }: { item: SectionData }) => {
    if (item.type === 'members') {
      return (
        <View style={styles.membersSection}>
          {/* <Text style={styles.sectionTitle}>Members</Text> */}
          <View style={styles.membersRow}>
            {members.map(member => (
              <View key={member._id.toHexString()} style={styles.memberItem}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.memberName} numberOfLines={1}>
                  {member.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    if (item.type === 'balance') {
      return (
        <View style={styles.balanceCard}>
          <Text style={styles.balanceName}>{item.name}</Text>
          <Text
            style={[
              styles.balanceAmount,
              {
                color:
                  Math.abs(item.netBalance) <= 0.01
                    ? colors.text2
                    : item.netBalance > 0
                    ? colors.accent
                    : colors.danger,
              },
            ]}
          >
            {Math.abs(item.netBalance) <= 0.01
              ? 'Settled'
              : item.netBalance > 0
              ? `Gets ₹${item.netBalance.toFixed(2)}`
              : `Owes ₹${Math.abs(item.netBalance).toFixed(2)}`}
          </Text>
        </View>
      );
    }

    if (item.type === 'settlement') {
      const toMember = getMember(item.to);
      const hasUpi = !!toMember?.upiId;
      return (
        <View style={styles.settlementCard}>
          <View style={styles.settlementLeft}>
            <Text style={styles.settlementText}>
              <Text style={{ color: colors.danger }}>{item.fromName}</Text>
              <Text style={{ color: colors.text2 }}> pays </Text>
              <Text style={{ color: colors.accent }}>{item.toName}</Text>
            </Text>
            <Text style={styles.settlementAmount}>
              ₹{item.amount.toFixed(2)}
            </Text>
          </View>
          <View style={styles.settlementActions}>
            {hasUpi && (
              <TouchableOpacity
                style={styles.upiBtn}
                onPress={() => handleUpiPay(item)}
              >
                <Text style={styles.upiBtnText}>Pay via UPI</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.markPaidBtn}
              onPress={() => markPaid(item)}
            >
              <Text style={styles.markPaidText}>Mark Paid</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (item.type === 'expense') {
      return (
        <TouchableOpacity
          style={styles.expenseCard}
          onPress={() => handleExpenseTap(item)}
          activeOpacity={0.7}
        >
          <View style={styles.expenseLeft}>
            <View style={styles.expenseDescRow}>
              {item.category ? (
                <Text style={styles.expenseCategoryEmoji}>
                  {CATEGORY_EMOJI[item.category] ?? '📦'}
                </Text>
              ) : null}
              <Text style={styles.expenseDesc} numberOfLines={1}>
                {item.description || 'Expense'}
              </Text>
            </View>
            <Text style={styles.expenseMeta}>
              Paid by {getMemberName(item.paidByMemberId)} ·{' '}
              {new Date(item.date).toLocaleDateString()}
            </Text>
          </View>
          <Text style={styles.expenseAmount}>₹{item.amount.toFixed(2)}</Text>
        </TouchableOpacity>
      );
    }

    if (item.type === 'empty') {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No expenses yet</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={group.name}
        subtitle={`${members.length} ${
          members.length === 1 ? 'member' : 'members'
        }`}
        backLabel="Groups"
        onBack={() => navigation.goBack()}
        right={
          <View style={styles.headerBtns}>
            <TouchableOpacity
              onPress={() => navigation.navigate('EditGroup', { groupId })}
            >
              <Text style={styles.headerBtn}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('ShareGroup', { groupId })}
            >
              <Text style={styles.headerBtn}>⬡ Share</Text>
            </TouchableOpacity>
          </View>
        }
      />
      <SectionList
        sections={sections}
        keyExtractor={(item, index) =>
          item.type === 'expense'
            ? item._id.toHexString()
            : `${item.type}-${index}`
        }
        renderItem={renderItem}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
      />

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
  },
  listContent: {
    paddingBottom: 20,
  },
  headerBtns: {
    flexDirection: 'row',
    gap: 14,
  },
  headerBtn: {
    color: colors.text2,
    fontSize: 14,
    fontWeight: '600',
  },
  shareBtn: {
    color: colors.text2,
    fontSize: 14,
    fontWeight: '600',
  },
  membersSection: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  membersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    marginBottom: 16,
    gap: 16,
  },
  memberItem: {
    alignItems: 'center',
    width: 48,
  },
  memberName: {
    color: colors.text2,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
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
    paddingTop: 4,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    backgroundColor: colors.bg,
  },
  balanceCard: {
    backgroundColor: colors.surface2,
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 20,
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
    marginHorizontal: 20,
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
  settlementActions: {
    flexDirection: 'column',
    gap: 6,
    alignItems: 'flex-end',
  },
  upiBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  markPaidBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  markPaidText: {
    color: colors.text2,
    fontSize: 12,
    fontWeight: '600',
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
    marginHorizontal: 20,
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
  expenseDescRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expenseCategoryEmoji: {
    fontSize: 15,
  },
  expenseDesc: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
    flex: 1,
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
    marginBottom: 16,
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
