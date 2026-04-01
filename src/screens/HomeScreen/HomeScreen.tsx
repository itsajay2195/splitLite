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

export default function HomeScreen() {
  const realm = useRealm();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    const results = realm.objects('Group');

    const update = () => {
      setGroups([...results]);
    };

    update();
    results.addListener(update);

    return () => {
      results.removeAllListeners();
    };
  }, [realm]);

  const getMeta = (groupId: any) => {
    const memberCount = realm.objects('Member').filtered('groupId == $0', groupId).length;
    const expenses = realm.objects('Expense').filtered('groupId == $0', groupId);
    const totalSpent = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    return { memberCount, totalSpent };
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
          const { memberCount, totalSpent } = getMeta(item._id);
          return (
            <TouchableOpacity
              style={styles.groupCard}
              onPress={() =>
                navigation.navigate('Group', { groupId: item._id.toHexString() })
              }
            >
              <View>
                <Text style={styles.groupName}>{item.name}</Text>
                <Text style={styles.groupMeta}>
                  {memberCount} {memberCount === 1 ? 'member' : 'members'}
                </Text>
              </View>

              <Text style={[styles.balance, { color: colors.text2 }]}>
                ₹{totalSpent.toFixed(0)} spent
              </Text>
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
  balance: {
    fontSize: 14,
    fontWeight: '600',
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
