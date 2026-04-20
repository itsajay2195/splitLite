import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Realm from 'realm';
import { colors } from '../../theme/color';
import { useRealm } from '../../realm/RealmContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAlert } from '../../components/AlertProvider';
import ScreenHeader from '../../components/ScreenHeader';

type ExistingMember = {
  id: string;
  name: string;
  upiId: string;
  hasActivity: boolean;
  markedForRemoval: boolean;
};

type NewMember = {
  name: string;
  upiId: string;
};

export default function EditGroupScreen() {
  const realm = useRealm();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { showAlert } = useAlert();
  const { groupId } = route.params;

  const [groupName, setGroupName] = useState('');
  const [existing, setExisting] = useState<ExistingMember[]>([]);
  const [newMembers, setNewMembers] = useState<NewMember[]>([]);
  const [nameInput, setNameInput] = useState('');
  const [upiInput, setUpiInput] = useState('');

  useEffect(() => {
    const gId = new Realm.BSON.ObjectId(groupId);
    const group: any = realm.objectForPrimaryKey('Group', gId);
    if (group) setGroupName(group.name);

    const memberResults: any[] = [...realm.objects('Member').filtered('groupId == $0', gId)];
    setExisting(
      memberResults.map(m => {
        const mId = m._id;
        const expCount = realm.objects('Expense').filtered('paidByMemberId == $0', mId).length;
        const splitCount = realm.objects('ExpenseSplit').filtered('memberId == $0', mId).length;
        return {
          id: mId.toHexString(),
          name: m.name,
          upiId: m.upiId ?? '',
          hasActivity: expCount > 0 || splitCount > 0,
          markedForRemoval: false,
        };
      }),
    );
  }, [groupId, realm]);

  const toggleRemove = (id: string) => {
    setExisting(prev =>
      prev.map(m => (m.id === id ? { ...m, markedForRemoval: !m.markedForRemoval } : m)),
    );
  };

  const addMember = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    const allNames = [
      ...existing.filter(m => !m.markedForRemoval).map(m => m.name.toLowerCase()),
      ...newMembers.map(m => m.name.toLowerCase()),
    ];
    if (allNames.includes(trimmed.toLowerCase())) {
      showAlert({ title: 'Duplicate', message: `"${trimmed}" is already in the group.` });
      return;
    }
    setNewMembers(prev => [...prev, { name: trimmed, upiId: upiInput.trim() }]);
    setNameInput('');
    setUpiInput('');
  };

  const removeNewMember = (index: number) => {
    setNewMembers(prev => prev.filter((_, i) => i !== index));
  };

  const saveGroup = useCallback(() => {
    const trimmedName = groupName.trim();
    if (!trimmedName) {
      showAlert({ title: 'Missing name', message: 'Please enter a group name.' });
      return;
    }
    const activeExisting = existing.filter(m => !m.markedForRemoval);
    if (activeExisting.length + newMembers.length === 0) {
      showAlert({ title: 'No members', message: 'A group needs at least one member.' });
      return;
    }

    try {
      const gId = new Realm.BSON.ObjectId(groupId);
      realm.write(() => {
        const group: any = realm.objectForPrimaryKey('Group', gId);
        if (group) group.name = trimmedName;

        existing
          .filter(m => m.markedForRemoval)
          .forEach(m => {
            const member = realm.objectForPrimaryKey('Member', new Realm.BSON.ObjectId(m.id));
            if (member) realm.delete(member);
          });

        newMembers.forEach(m => {
          realm.create('Member', {
            _id: new Realm.BSON.ObjectId(),
            groupId: gId,
            name: m.name,
            upiId: m.upiId || undefined,
          });
        });
      });
      navigation.goBack();
    } catch {
      showAlert({ title: 'Error', message: 'Could not save changes. Please try again.' });
    }
  }, [groupName, existing, newMembers, groupId, realm, navigation, showAlert]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader title="Edit Group" backLabel="Group" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          placeholder="Group name"
          placeholderTextColor={colors.text3}
          style={styles.input}
          value={groupName}
          onChangeText={setGroupName}
        />

        <Text style={styles.label}>Members</Text>

        {existing.map(member => (
          <View
            key={member.id}
            style={[styles.memberChip, member.markedForRemoval && styles.memberChipRemoved]}
          >
            <View style={styles.memberInfo}>
              <Text
                style={[styles.memberName, member.markedForRemoval && styles.memberNameRemoved]}
              >
                {member.name}
              </Text>
              {member.upiId ? (
                <Text style={styles.memberUpi}>{member.upiId}</Text>
              ) : null}
            </View>

            {member.hasActivity ? (
              <Text style={styles.activityTag}>Has expenses</Text>
            ) : (
              <TouchableOpacity onPress={() => toggleRemove(member.id)}>
                {member.markedForRemoval
                  ? <Text style={styles.undoBtn}>Undo</Text>
                  : <Ionicons name="close" size={18} color={colors.text3} />}
              </TouchableOpacity>
            )}
          </View>
        ))}

        {newMembers.map((m, i) => (
          <View key={i} style={styles.memberChip}>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{m.name}</Text>
              {m.upiId ? <Text style={styles.memberUpi}>{m.upiId}</Text> : null}
            </View>
            <View style={styles.newTag}>
              <Text style={styles.newTagText}>New</Text>
            </View>
            <TouchableOpacity onPress={() => removeNewMember(i)}>
              <Ionicons name="close" size={18} color={colors.text3} />
            </TouchableOpacity>
          </View>
        ))}

        <Text style={styles.label}>Add member</Text>

        <TextInput
          placeholder="Name"
          placeholderTextColor={colors.text3}
          style={styles.input}
          value={nameInput}
          onChangeText={setNameInput}
          returnKeyType="next"
        />

        <View style={styles.upiRow}>
          <TextInput
            placeholder="UPI ID (optional)"
            placeholderTextColor={colors.text3}
            style={[styles.input, styles.upiInput]}
            value={upiInput}
            onChangeText={setUpiInput}
            onSubmitEditing={addMember}
            returnKeyType="done"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TouchableOpacity style={styles.addBtn} onPress={addMember}>
            <Ionicons name="add" size={22} color="#000" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={saveGroup}>
          <Text style={styles.saveText}>Save Changes</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  form: {
    padding: 20,
    paddingBottom: 8,
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
  upiInput: {
    flex: 1,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingHorizontal: 18,
    justifyContent: 'center',
    marginBottom: 12,
  },
  addBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 20,
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
    gap: 8,
  },
  memberChipRemoved: {
    opacity: 0.4,
    borderColor: colors.danger,
    borderStyle: 'dashed',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: colors.text,
    fontWeight: '600',
  },
  memberNameRemoved: {
    textDecorationLine: 'line-through',
    color: colors.text3,
  },
  memberUpi: {
    color: colors.text3,
    fontSize: 11,
    marginTop: 2,
  },
  activityTag: {
    color: colors.text3,
    fontSize: 11,
    fontStyle: 'italic',
  },
  removeBtn: {
    color: colors.text3,
    fontSize: 20,
    paddingLeft: 8,
    lineHeight: 24,
  },
  undoBtn: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
    paddingLeft: 0,
  },
  newTag: {
    backgroundColor: 'rgba(0,229,160,0.12)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  newTagText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '700',
  },
  footer: {
    padding: 20,
    paddingTop: 8,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    padding: 16,
    borderRadius: 16,
  },
  saveText: {
    textAlign: 'center',
    fontWeight: '700',
    color: '#000',
  },
});
