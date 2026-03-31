import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/color';
import Realm from 'realm';
import { useRealm } from '../../realm/RealmContext';

export default function CreateGroupScreen() {
  const realm = useRealm();
  const navigation = useNavigation<any>();
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [memberInput, setMemberInput] = useState('');

  const addMember = () => {
    const trimmed = memberInput.trim();
    if (!trimmed) return;
    if (members.map(m => m.toLowerCase()).includes(trimmed.toLowerCase())) {
      Alert.alert('Duplicate', `"${trimmed}" is already added.`);
      return;
    }
    setMembers([...members, trimmed]);
    setMemberInput('');
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const createGroup = useCallback(async () => {
    const trimmedName = groupName.trim();
    if (!trimmedName) {
      Alert.alert('Missing name', 'Please enter a group name.');
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

        members.forEach(memberName => {
          realm.create('Member', {
            _id: new Realm.BSON.ObjectId(),
            groupId,
            name: memberName,
          });
        });
      });

      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Could not create group. Please try again.');
    }
  }, [groupName, members, navigation, realm]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Group</Text>

      <TextInput
        placeholder="Group name"
        placeholderTextColor={colors.text3}
        style={styles.input}
        value={groupName}
        onChangeText={setGroupName}
      />

      <View style={styles.memberRow}>
        <TextInput
          placeholder="Add member"
          placeholderTextColor={colors.text3}
          style={[styles.input, { flex: 1 }]}
          value={memberInput}
          onChangeText={setMemberInput}
          onSubmitEditing={addMember}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addBtn} onPress={addMember}>
          <Text style={{ color: '#000' }}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={members}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.memberChip}>
            <Text style={{ color: colors.text, flex: 1 }}>{item}</Text>
            <TouchableOpacity onPress={() => removeMember(index)}>
              <Text style={{ color: colors.text3, fontSize: 16, paddingLeft: 10 }}>×</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={styles.saveBtn} onPress={createGroup}>
        <Text style={styles.saveText}>Create Group</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
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
  memberRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  memberChip: {
    backgroundColor: colors.surface,
    padding: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
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
