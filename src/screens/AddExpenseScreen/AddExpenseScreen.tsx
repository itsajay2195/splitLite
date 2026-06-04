import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import Realm from 'realm';
import { colors } from '../../theme/color';
import { useAlert } from '../../components/AlertProvider';
import { useRealm } from '../../realm/RealmContext';
import ScreenHeader from '../../components/ScreenHeader';
import { logActivity } from '../../utils/activityLogger';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getCurrentUser } from '../../utils/firebaseAuth';
import { db } from '../../firebase/firestore';
import { syncExpenseAdded, syncExpenseUpdated } from '../../services/firestoreSync';

type SplitMode = 'equal' | 'amount' | 'percent' | 'shares';
type Member = { id: string; name: string; upiId?: string };

const CATEGORIES = [
  { key: 'food', emoji: '🍔', label: 'Food' },
  { key: 'travel', emoji: '✈️', label: 'Travel' },
  { key: 'rent', emoji: '🏠', label: 'Rent' },
  { key: 'fun', emoji: '🎉', label: 'Fun' },
  { key: 'grocery', emoji: '🛒', label: 'Grocery' },
  { key: 'transport', emoji: '🚗', label: 'Transport' },
  { key: 'health', emoji: '💊', label: 'Health' },
  { key: 'other', emoji: '📦', label: 'Other' },
];

const SPLIT_MODES: { key: SplitMode; label: string }[] = [
  { key: 'equal', label: 'Equal' },
  { key: 'amount', label: '₹' },
  { key: 'percent', label: '%' },
  { key: 'shares', label: 'Shares' },
];

export default function AddExpenseScreen() {
  const realm = useRealm();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { showAlert } = useAlert();
  const { groupId, expenseId, initialMembers, initialExpense } = route.params;
  const isEditing = !!expenseId;
  const isLoggedIn = !!getCurrentUser();

  const [members, setMembers] = useState<Member[]>([]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
  const [category, setCategory] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (isLoggedIn && initialMembers?.length) {
      // ── Logged-in: use Firestore members passed from GroupScreen ──
      const mems: Member[] = initialMembers.map((m: any) => ({
        id: m.id, name: m.name, upiId: m.upiId ?? undefined,
      }));
      setMembers(mems);
      if (!isEditing && mems.length > 0) setSelectedMember(mems[0].id);
      if (isEditing && initialExpense) {
        setAmount(String(initialExpense.amount));
        setDescription(initialExpense.description ?? '');
        setSelectedMember(initialExpense.paidByMemberId ?? null);
        setCategory(initialExpense.category ?? null);
        if (initialExpense.date) setDate(new Date(initialExpense.date));
      }
    } else {
      // ── Guest: read members from Realm ──
      try {
        const objectId = new Realm.BSON.ObjectId(groupId);
        const results: any[] = [...realm.objects('Member').filtered('groupId == $0', objectId)];
        const mems: Member[] = results.map(m => ({
          id: m._id.toHexString(), name: m.name, upiId: m.upiId ?? undefined,
        }));
        setMembers(mems);
        if (!isEditing && mems.length > 0) setSelectedMember(mems[0].id);
        if (isEditing) {
          const existing: any = realm.objectForPrimaryKey('Expense', new Realm.BSON.ObjectId(expenseId));
          if (existing) {
            setAmount(String(existing.amount));
            setDescription(existing.description);
            setSelectedMember(existing.paidByMemberId.toHexString());
            setCategory(existing.category ?? null);
            if (existing.date) setDate(new Date(existing.date));
          }
        }
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildDefaults = (mode: SplitMode, numericAmount: number, mems: Member[]): Record<string, string> => {
    const defaults: Record<string, string> = {};
    mems.forEach((m, i) => {
      if (mode === 'amount') {
        const base = Math.floor((numericAmount / mems.length) * 100) / 100;
        const rem = Math.round((numericAmount - base * mems.length) * 100) / 100;
        defaults[m.id] = String(i === mems.length - 1 ? base + rem : base);
      } else if (mode === 'percent') {
        const base = Math.floor((100 / mems.length) * 10) / 10;
        const rem = Math.round((100 - base * mems.length) * 10) / 10;
        defaults[m.id] = String(i === mems.length - 1 ? base + rem : base);
      } else if (mode === 'shares') {
        defaults[m.id] = '1';
      }
    });
    return defaults;
  };

  const handleSplitModeChange = (mode: SplitMode) => {
    setSplitMode(mode);
    if (mode !== 'equal') setSplitValues(buildDefaults(mode, parseFloat(amount) || 0, members));
  };

  const numericAmount = parseFloat(amount) || 0;

  const remaining = useMemo(() => {
    if (splitMode === 'amount') {
      const sum = members.reduce((s, m) => s + (parseFloat(splitValues[m.id] || '0') || 0), 0);
      return Math.round((numericAmount - sum) * 100) / 100;
    }
    if (splitMode === 'percent') {
      const sum = members.reduce((s, m) => s + (parseFloat(splitValues[m.id] || '0') || 0), 0);
      return Math.round((100 - sum) * 10) / 10;
    }
    return null;
  }, [numericAmount, splitMode, splitValues, members]);

  const totalShares = useMemo(() => {
    if (splitMode !== 'shares') return 0;
    return members.reduce((s, m) => s + (parseFloat(splitValues[m.id] || '1') || 1), 0);
  }, [splitMode, splitValues, members]);

  const computeSplits = (total: number): { memberId: string; amount: number }[] => {
    if (splitMode === 'equal') {
      const base = Math.floor((total / members.length) * 100) / 100;
      const rem = Math.round((total - base * members.length) * 100) / 100;
      return members.map((m, i) => ({ memberId: m.id, amount: i === members.length - 1 ? base + rem : base }));
    }
    if (splitMode === 'amount') {
      return members.map(m => ({ memberId: m.id, amount: Math.round((parseFloat(splitValues[m.id] || '0') || 0) * 100) / 100 }));
    }
    if (splitMode === 'percent') {
      const splits = members.map(m => ({ memberId: m.id, amount: Math.floor(((parseFloat(splitValues[m.id] || '0') || 0) / 100) * total * 100) / 100 }));
      const sumSoFar = splits.slice(0, -1).reduce((s, x) => s + x.amount, 0);
      splits[splits.length - 1].amount = Math.round((total - sumSoFar) * 100) / 100;
      return splits;
    }
    const splits = members.map(m => ({ memberId: m.id, amount: Math.floor(((parseFloat(splitValues[m.id] || '1') || 1) / totalShares) * total * 100) / 100 }));
    const sumSoFar = splits.slice(0, -1).reduce((s, x) => s + x.amount, 0);
    splits[splits.length - 1].amount = Math.round((total - sumSoFar) * 100) / 100;
    return splits;
  };

  const validate = (total: number): boolean => {
    if (splitMode === 'amount') {
      const sum = members.reduce((s, m) => s + (parseFloat(splitValues[m.id] || '0') || 0), 0);
      if (Math.abs(sum - total) > 0.01) { showAlert({ title: "Amounts don't add up", message: `Total split ₹${sum.toFixed(2)} must equal ₹${total.toFixed(2)}.` }); return false; }
    }
    if (splitMode === 'percent') {
      const sum = members.reduce((s, m) => s + (parseFloat(splitValues[m.id] || '0') || 0), 0);
      if (Math.abs(sum - 100) > 0.1) { showAlert({ title: "Percentages don't add up", message: `Total ${sum.toFixed(1)}% must equal 100%.` }); return false; }
    }
    if (splitMode === 'shares') {
      const invalid = members.some(m => { const v = parseFloat(splitValues[m.id] || '0'); return isNaN(v) || v <= 0; });
      if (invalid) { showAlert({ title: 'Invalid shares', message: 'Each member must have a share greater than 0.' }); return false; }
    }
    return true;
  };

  const saveExpense = () => {
    const total = parseFloat(amount);
    if (!amount || isNaN(total) || total <= 0) { showAlert({ title: 'Invalid amount', message: 'Please enter a valid amount greater than 0.' }); return; }
    if (!selectedMember) { showAlert({ title: 'No payer', message: 'Please select who paid.' }); return; }
    if (!validate(total)) return;

    const splits = computeSplits(total);
    const payerName = members.find(m => m.id === selectedMember)?.name ?? 'Someone';
    const splitsMap: Record<string, number> = {};
    splits.forEach(s => { splitsMap[s.memberId] = s.amount; });

    if (isLoggedIn) {
      // ── Logged-in: write directly to Firestore ──
      const docId = isEditing ? expenseId : new Realm.BSON.ObjectId().toHexString();
      db.collection('groups').doc(groupId).collection('expenses').doc(docId).set({
        description: description.trim(),
        amount: total,
        paidByMemberId: selectedMember,
        date,
        category: category ?? null,
        splitAmong: splits.map(s => s.memberId),
        splits: Object.keys(splitsMap).length > 0 ? splitsMap : null,
      }).catch(() => {});
      logActivity(groupId, isEditing ? 'expense_edited' : 'expense_added',
        `${payerName} ${isEditing ? 'updated' : 'added'} ${description.trim() || 'expense'} ₹${total.toFixed(2)}`);
      navigation.goBack();
    } else {
      // ── Guest: write to Realm ──
      try {
        const paidById = new Realm.BSON.ObjectId(selectedMember);
        const groupObjectId = new Realm.BSON.ObjectId(groupId);

        if (isEditing) {
          const existing: any = realm.objectForPrimaryKey('Expense', new Realm.BSON.ObjectId(expenseId));
          if (!existing) { showAlert({ title: 'Error', message: 'Expense not found.' }); return; }
          realm.write(() => {
            existing.amount = total;
            existing.description = description.trim();
            existing.paidByMemberId = paidById;
            existing.category = category ?? undefined;
            realm.delete(realm.objects('ExpenseSplit').filtered('expenseId == $0', existing._id));
            splits.forEach(s => {
              realm.create('ExpenseSplit', { _id: new Realm.BSON.ObjectId(), expenseId: existing._id, memberId: new Realm.BSON.ObjectId(s.memberId), amount: s.amount });
            });
          });
          syncExpenseUpdated(realm, groupObjectId, new Realm.BSON.ObjectId(expenseId));
          logActivity(groupId, 'expense_edited', `${payerName} updated ${description.trim() || 'expense'} to ₹${total.toFixed(2)}`);
        } else {
          const expenseObjId = new Realm.BSON.ObjectId();
          realm.write(() => {
            realm.create('Expense', { _id: expenseObjId, groupId: groupObjectId, amount: total, paidByMemberId: paidById, description: description.trim(), date, category: category ?? undefined });
            splits.forEach(s => {
              realm.create('ExpenseSplit', { _id: new Realm.BSON.ObjectId(), expenseId: expenseObjId, memberId: new Realm.BSON.ObjectId(s.memberId), amount: s.amount });
            });
          });
          syncExpenseAdded(realm, groupObjectId, expenseObjId);
          logActivity(groupId, 'expense_added', `${payerName} added ${description.trim() || 'expense'} ₹${total.toFixed(2)}`);
        }
        navigation.goBack();
      } catch {
        showAlert({ title: 'Error', message: 'Could not save expense. Please try again.' });
      }
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScreenHeader title={isEditing ? 'Edit Expense' : 'Add Expense'} backLabel="Group" onBack={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <TextInput placeholder="Amount" placeholderTextColor={colors.text3} keyboardType="numeric" style={styles.amountInput} value={amount} onChangeText={v => setAmount(v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))} autoFocus={!isEditing} />
        <TextInput placeholder="What for?" placeholderTextColor={colors.text3} style={styles.input} value={description} onChangeText={setDescription} />

        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={16} color={colors.text2} />
          <Text style={styles.dateBtnText}>{date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</Text>
          <Ionicons name="chevron-down-outline" size={14} color={colors.text3} />
        </TouchableOpacity>

        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker value={date} mode="date" display="default" maximumDate={new Date()} onChange={(_, s) => { setShowDatePicker(false); if (s) setDate(s); }} />
        )}
        {showDatePicker && Platform.OS === 'ios' && (
          <Modal transparent animationType="slide">
            <View style={styles.iosPickerOverlay}>
              <View style={styles.iosPickerSheet}>
                <View style={styles.iosPickerBar}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}><Text style={styles.iosPickerDone}>Done</Text></TouchableOpacity>
                </View>
                <DateTimePicker value={date} mode="date" display="spinner" maximumDate={new Date()} onChange={(_, s) => { if (s) setDate(s); }} />
              </View>
            </View>
          </Modal>
        )}

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryRow} keyboardShouldPersistTaps="handled">
          {CATEGORIES.map(cat => {
            const isSelected = category === cat.key;
            return (
              <TouchableOpacity key={cat.key} style={[styles.categoryChip, isSelected && styles.categoryChipSelected]} onPress={() => setCategory(isSelected ? null : cat.key)}>
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>Paid by</Text>
        <View style={styles.avatarRow}>
          {members.map(item => {
            const isSelected = selectedMember === item.id;
            return (
              <TouchableOpacity key={item.id} style={[styles.avatar, isSelected && styles.avatarSelected]} onPress={() => setSelectedMember(item.id)}>
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                {isSelected && <Text style={styles.avatarName}>{item.name}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.splitHeader}>
          <Text style={styles.label}>Split</Text>
          {remaining !== null && (
            <View style={[styles.remainingPill, Math.abs(remaining) <= 0.01 && styles.remainingPillDone]}>
              <Text style={[styles.remainingText, Math.abs(remaining) <= 0.01 && styles.remainingTextDone]}>
                {Math.abs(remaining) <= 0.01 ? '✓ Balanced' : splitMode === 'percent' ? `${Math.abs(remaining)}% ${remaining > 0 ? 'left' : 'over'}` : `₹${Math.abs(remaining).toFixed(2)} ${remaining > 0 ? 'left' : 'over'}`}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.modeTabs}>
          {SPLIT_MODES.map(({ key, label }) => (
            <TouchableOpacity key={key} style={[styles.modeTab, splitMode === key && styles.modeTabActive]} onPress={() => handleSplitModeChange(key)}>
              <Text style={[styles.modeTabText, splitMode === key && styles.modeTabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {splitMode !== 'equal' && members.map(member => {
          const shareVal = parseFloat(splitValues[member.id] || '1') || 1;
          const shareAmount = splitMode === 'shares' && totalShares > 0 ? (shareVal / totalShares) * numericAmount : null;
          return (
            <View key={member.id} style={styles.splitRow}>
              <View style={styles.splitAvatar}><Text style={styles.splitAvatarText}>{member.name.charAt(0).toUpperCase()}</Text></View>
              <Text style={styles.splitName} numberOfLines={1}>{member.name}</Text>
              <View style={styles.splitInputWrap}>
                {splitMode === 'amount' && <Text style={styles.splitUnit}>₹</Text>}
                <TextInput style={styles.splitInput} keyboardType="numeric" value={splitValues[member.id] || ''} onChangeText={v => setSplitValues(p => ({ ...p, [member.id]: v }))} placeholder={splitMode === 'shares' ? '1' : '0'} placeholderTextColor={colors.text3} />
                {splitMode === 'percent' && <Text style={styles.splitUnit}>%</Text>}
                {splitMode === 'shares' && shareAmount !== null && <Text style={styles.splitCalc}>≈ ₹{shareAmount.toFixed(2)}</Text>}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={saveExpense}>
          <Text style={styles.saveText}>{isEditing ? 'Update Expense' : 'Save Expense'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  form: { padding: 20, paddingBottom: 8 },
  amountInput: { backgroundColor: colors.surface2, borderRadius: 20, padding: 20, fontSize: 32, color: colors.text, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  input: { backgroundColor: colors.surface2, borderRadius: 14, padding: 14, color: colors.text, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.text2, marginBottom: 10, fontSize: 13 },
  categoryScroll: { marginBottom: 20 },
  categoryRow: { gap: 8, paddingRight: 4 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  categoryChipSelected: { backgroundColor: 'rgba(0,229,160,0.12)', borderColor: colors.accent },
  categoryEmoji: { fontSize: 15 },
  categoryLabel: { color: colors.text2, fontSize: 13, fontWeight: '500' },
  categoryLabelSelected: { color: colors.accent, fontWeight: '700' },
  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  avatar: { minWidth: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface2, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8 },
  avatarSelected: { borderColor: colors.accent, borderWidth: 2, backgroundColor: colors.surface },
  avatarText: { color: colors.text, fontWeight: '700' },
  avatarName: { color: colors.accent, fontSize: 9, marginTop: 1 },
  splitHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  remainingPill: { backgroundColor: 'rgba(255,74,107,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: colors.danger },
  remainingPillDone: { backgroundColor: 'rgba(0,229,160,0.12)', borderColor: colors.accent },
  remainingText: { fontSize: 11, fontWeight: '600', color: colors.danger },
  remainingTextDone: { color: colors.accent },
  modeTabs: { flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 16, padding: 3, gap: 3 },
  modeTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  modeTabActive: { backgroundColor: colors.accent },
  modeTabText: { color: colors.text2, fontSize: 13, fontWeight: '600' },
  modeTabTextActive: { color: '#000' },
  splitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  splitAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface2, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  splitAvatarText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  splitName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '500' },
  splitInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface2, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, minWidth: 100 },
  splitUnit: { color: colors.text2, fontSize: 13, marginRight: 2 },
  splitInput: { color: colors.text, fontSize: 14, fontWeight: '600', paddingVertical: 8, minWidth: 48, textAlign: 'right' },
  splitCalc: { color: colors.text2, fontSize: 11, marginLeft: 4 },
  footer: { padding: 20, paddingTop: 8 },
  saveBtn: { backgroundColor: colors.accent, padding: 16, borderRadius: 16 },
  saveText: { textAlign: 'center', fontWeight: '700', color: '#000' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface2, borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  dateBtnText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '500' },
  iosPickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  iosPickerSheet: { backgroundColor: colors.surface2, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  iosPickerBar: { flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  iosPickerDone: { color: colors.accent, fontSize: 16, fontWeight: '700' },
});
