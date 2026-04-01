import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Realm from 'realm';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../../theme/color';
import { useRealm } from '../../realm/RealmContext';
import ScreenHeader from '../../components/ScreenHeader';

const MAX_QR_BYTES = 2800;

export default function ShareGroupScreen() {
  const realm = useRealm();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { groupId } = route.params;

  const [qrData, setQrData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    try {
      const objectId = new Realm.BSON.ObjectId(groupId);
      const group = realm.objectForPrimaryKey('Group', objectId);
      const members = realm.objects('Member').filtered('groupId == $0', objectId);
      const expenses = realm.objects('Expense').filtered('groupId == $0', objectId);
      const splits = realm.objects('ExpenseSplit');

      if (!group) { setError('Group not found.'); return; }

      setGroupName((group as any).name);

      const expenseIds = new Set([...expenses].map(e => (e as any)._id.toHexString()));
      const relevantSplits = [...splits].filter(s =>
        expenseIds.has((s as any).expenseId.toHexString()),
      );

      const payload = {
        v: 1,
        group: { id: groupId, name: (group as any).name, createdAt: (group as any).createdAt.toISOString() },
        members: [...members].map((m: any) => ({ id: m._id.toHexString(), name: m.name, upiId: m.upiId ?? null })),
        expenses: [...expenses].map((e: any) => ({ id: e._id.toHexString(), amount: e.amount, paidBy: e.paidByMemberId.toHexString(), desc: e.description, date: e.date.toISOString() })),
        splits: relevantSplits.map((s: any) => ({ expenseId: s.expenseId.toHexString(), memberId: s.memberId.toHexString(), amount: s.amount })),
      };

      const json = JSON.stringify(payload);
      if (new TextEncoder().encode(json).length > MAX_QR_BYTES) {
        setError(`Group data is too large for a single QR code (${[...expenses].length} expenses). Try exporting a smaller group.`);
        return;
      }
      setQrData(json);
    } catch {
      setError('Could not generate QR code.');
    }
  }, [groupId, realm]);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Share Group"
        subtitle={groupName || undefined}
        backLabel={groupName || 'Back'}
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={[]}
        keyExtractor={() => ''}
        renderItem={null}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            {!qrData && !error && (
              <ActivityIndicator color={colors.accent} style={styles.loader} />
            )}

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {qrData && (
              <>
                <View style={styles.qrWrapper}>
                  <QRCode
                    value={qrData}
                    size={240}
                    backgroundColor={colors.surface2}
                    color={colors.text}
                  />
                </View>
                <View style={styles.infoBox}>
                  <Text style={styles.infoTitle}>How to use</Text>
                  <Text style={styles.infoText}>
                    Let a friend scan this QR code in their SplitLite app to import the full group — members, expenses, and balances — with no internet required.
                  </Text>
                </View>
              </>
            )}
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  loader: {
    marginTop: 40,
  },
  qrWrapper: {
    backgroundColor: colors.surface2,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 32,
    marginTop: 20,
  },
  infoBox: {
    backgroundColor: colors.surface2,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  infoTitle: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: 6,
  },
  infoText: {
    color: colors.text2,
    fontSize: 13,
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(255,74,107,0.1)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.danger,
    marginTop: 32,
    width: '100%',
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
});
