import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Realm from 'realm';
import { colors } from '../../theme/color';
import { useRealm } from '../../realm/RealmContext';
import { useAlert } from '../../components/AlertProvider';
import ScreenHeader from '../../components/ScreenHeader';

export default function AddExpenseScreen() {
  const realm = useRealm();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { showAlert } = useAlert();
  const { groupId, expenseId } = route.params;
  const isEditing = !!expenseId;

  const [members, setMembers] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  useEffect(() => {
    const objectId = new Realm.BSON.ObjectId(groupId);
    const results: any = realm.objects('Member').filtered('groupId == $0', objectId);
    setMembers([...results]);

    if (isEditing) {
      const existing: any = realm.objectForPrimaryKey('Expense', new Realm.BSON.ObjectId(expenseId));
      if (existing) {
        setAmount(String(existing.amount));
        setDescription(existing.description);
        setSelectedMember(existing.paidByMemberId.toHexString());
      }
    } else if (results.length > 0) {
      setSelectedMember(results[0]._id.toHexString());
    }
  }, [groupId, expenseId, isEditing, realm]);

  const saveExpense = () => {
    const numericAmount = parseFloat(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      showAlert({ title: 'Invalid amount', message: 'Please enter a valid amount greater than 0.' });
      return;
    }
    if (!selectedMember) {
      showAlert({ title: 'No payer', message: 'Please select who paid.' });
      return;
    }

    const paidById = new Realm.BSON.ObjectId(selectedMember);
    const baseAmount = Math.floor((numericAmount / members.length) * 100) / 100;
    const remainder = Math.round((numericAmount - baseAmount * members.length) * 100) / 100;

    try {
      if (isEditing) {
        const existing: any = realm.objectForPrimaryKey('Expense', new Realm.BSON.ObjectId(expenseId));
        realm.write(() => {
          existing.amount = numericAmount;
          existing.description = description.trim();
          existing.paidByMemberId = paidById;
          const oldSplits = realm.objects('ExpenseSplit').filtered('expenseId == $0', existing._id);
          realm.delete(oldSplits);
          members.forEach((member, index) => {
            realm.create('ExpenseSplit', {
              _id: new Realm.BSON.ObjectId(),
              expenseId: existing._id,
              memberId: member._id,
              amount: index === members.length - 1 ? baseAmount + remainder : baseAmount,
            });
          });
        });
      } else {
        const expenseObjId = new Realm.BSON.ObjectId();
        const groupObjectId = new Realm.BSON.ObjectId(groupId);
        realm.write(() => {
          realm.create('Expense', {
            _id: expenseObjId,
            groupId: groupObjectId,
            amount: numericAmount,
            paidByMemberId: paidById,
            description: description.trim(),
            date: new Date(),
          });
          members.forEach((member, index) => {
            realm.create('ExpenseSplit', {
              _id: new Realm.BSON.ObjectId(),
              expenseId: expenseObjId,
              memberId: member._id,
              amount: index === members.length - 1 ? baseAmount + remainder : baseAmount,
            });
          });
        });
      }
      navigation.goBack();
    } catch {
      showAlert({ title: 'Error', message: 'Could not save expense. Please try again.' });
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={isEditing ? 'Edit Expense' : 'Add Expense'}
        backLabel="Group"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.form}>
        <TextInput
          placeholder="Amount"
          placeholderTextColor={colors.text3}
          keyboardType="numeric"
          style={styles.amountInput}
          value={amount}
          onChangeText={setAmount}
          autoFocus={!isEditing}
        />

        <TextInput
          placeholder="What for?"
          placeholderTextColor={colors.text3}
          style={styles.input}
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>Paid by</Text>

        <FlatList
          horizontal
          data={members}
          keyExtractor={item => item._id.toHexString()}
          renderItem={({ item }) => {
            const isSelected = selectedMember === item._id.toHexString();
            return (
              <TouchableOpacity
                style={[styles.avatar, isSelected && styles.avatarSelected]}
                onPress={() => setSelectedMember(item._id.toHexString())}
              >
                <Text style={styles.avatarText}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
                {isSelected && <Text style={styles.avatarName}>{item.name}</Text>}
              </TouchableOpacity>
            );
          }}
        />

        <TouchableOpacity style={styles.saveBtn} onPress={saveExpense}>
          <Text style={styles.saveText}>{isEditing ? 'Update Expense' : 'Save Expense'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  form: {
    flex: 1,
    padding: 20,
  },
  amountInput: {
    backgroundColor: colors.surface2,
    borderRadius: 20,
    padding: 20,
    fontSize: 32,
    color: colors.text,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: 14,
    padding: 14,
    color: colors.text,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    color: colors.text2,
    marginBottom: 10,
  },
  avatar: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
  },
  avatarSelected: {
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: colors.surface,
  },
  avatarText: {
    color: colors.text,
    fontWeight: '700',
  },
  avatarName: {
    color: colors.accent,
    fontSize: 9,
    marginTop: 1,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    padding: 16,
    borderRadius: 16,
    marginTop: 'auto',
  },
  saveText: {
    textAlign: 'center',
    fontWeight: '700',
    color: '#000',
  },
});
