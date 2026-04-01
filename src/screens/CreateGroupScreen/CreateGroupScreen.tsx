import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/color';
import Realm from 'realm';
import { useRealm } from '../../realm/RealmContext';
import { useAlert } from '../../components/AlertProvider';
import ScreenHeader from '../../components/ScreenHeader';

type MemberEntry = {
  name: string;
  upiId: string;
};

export default function CreateGroupScreen() {
  const realm = useRealm();
  const navigation = useNavigation<any>();
  const { showAlert } = useAlert();

  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<MemberEntry[]>([]);
  const [memberInput, setMemberInput] = useState('');
  const [upiInput, setUpiInput] = useState('');

  const addMember = () => {
    const trimmed = memberInput.trim();
    if (!trimmed) return;
    if (members.map(m => m.name.toLowerCase()).includes(trimmed.toLowerCase())) {
      showAlert({ title: 'Duplicate', message: `"${trimmed}" is already added.` });
      return;
    }
    setMembers([...members, { name: trimmed, upiId: upiInput.trim() }]);
    setMemberInput('');
    setUpiInput('');
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const createGroup = useCallback(async () => {
    const trimmedName = groupName.trim();
    if (!trimmedName) {
      showAlert({ title: 'Missing name', message: 'Please enter a group name.' });
      return;
    }

    try {
      const groupId = new Realm.BSON.ObjectId();

      realm.write(() => {
        realm.create('Group', {
          _id: groupId,
          name: trimmedName,
          createdAt: new Date(),
        });

        members.forEach(member => {
          realm.create('Member', {
            _id: new Realm.BSON.ObjectId(),
            groupId,
            name: member.name,
            upiId: member.upiId || undefined,
          });
        });
      });

      navigation.goBack();
    } catch (error) {
      showAlert({ title: 'Error', message: 'Could not create group. Please try again.' });
    }
  }, [groupName, members, navigation, realm, showAlert]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="New Group" backLabel="Groups" onBack={() => navigation.goBack()} />

      <View style={styles.form}>
      <TextInput
        placeholder="Group name"
        placeholderTextColor={colors.text3}
        style={styles.input}
        value={groupName}
        onChangeText={setGroupName}
      />

      <Text style={styles.label}>Members</Text>

      <TextInput
        placeholder="Name"
        placeholderTextColor={colors.text3}
        style={styles.input}
        value={memberInput}
        onChangeText={setMemberInput}
        returnKeyType="next"
      />

      <View style={styles.upiRow}>
        <TextInput
          placeholder="UPI ID (optional, e.g. name@upi)"
          placeholderTextColor={colors.text3}
          style={[styles.input, { flex: 1 }]}
          value={upiInput}
          onChangeText={setUpiInput}
          onSubmitEditing={addMember}
          returnKeyType="done"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TouchableOpacity style={styles.addBtn} onPress={addMember}>
          <Text style={{ color: '#000', fontWeight: '700' }}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={members}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.memberChip}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{item.name}</Text>
              {item.upiId ? (
                <Text style={{ color: colors.text3, fontSize: 11, marginTop: 2 }}>
                  {item.upiId}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={() => removeMember(index)}>
              <Text style={{ color: colors.text3, fontSize: 18, paddingLeft: 12 }}>×</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={styles.saveBtn} onPress={createGroup}>
        <Text style={styles.saveText}>Create Group</Text>
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
  label: {
    color: colors.text2,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  input: {
    backgroundColor: colors.surface2,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    color: colors.text,
    marginBottom: 12,
  },
  upiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingHorizontal: 18,
    justifyContent: 'center',
    marginBottom: 12,
  },
  memberChip: {
    backgroundColor: colors.surface,
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
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
