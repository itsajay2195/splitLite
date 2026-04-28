import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import Realm from 'realm';
import { colors } from '../../theme/color';
import { useRealm } from '../../realm/RealmContext';
import { useAlert } from '../../components/AlertProvider';

export default function ImportGroupScreen() {
  const realm = useRealm();
  const navigation = useNavigation<any>();
  const { showAlert } = useAlert();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const device = useCameraDevice('back');

  useEffect(() => {
    Camera.requestCameraPermission().then(status => {
      setHasPermission(status === 'granted');
    });
  }, []);

  const applyPayload = (payload: any, existingId: Realm.BSON.ObjectId, isSyncing: boolean) => {
    realm.write(() => {
      if (!isSyncing) {
        realm.create('Group', {
          _id: existingId,
          name: payload.group.name,
          createdAt: new Date(payload.group.createdAt),
        });
      }

      // Members — skip if already exists
      payload.members?.forEach((m: any) => {
        const mId = new Realm.BSON.ObjectId(m.id);
        if (!realm.objectForPrimaryKey('Member', mId)) {
          realm.create('Member', {
            _id: mId,
            groupId: existingId,
            name: m.name,
            upiId: m.upiId ?? undefined,
          });
        }
      });

      // Expenses + their splits — skip if already exists
      payload.expenses?.forEach((e: any) => {
        const eId = new Realm.BSON.ObjectId(e.id);
        if (!realm.objectForPrimaryKey('Expense', eId)) {
          realm.create('Expense', {
            _id: eId,
            groupId: existingId,
            amount: e.amount,
            paidByMemberId: new Realm.BSON.ObjectId(e.paidBy),
            description: e.desc ?? '',
            date: new Date(e.date),
            category: e.category ?? undefined,
          });
          // Only create splits for new expenses
          payload.splits
            ?.filter((s: any) => s.expenseId === e.id)
            .forEach((s: any) => {
              realm.create('ExpenseSplit', {
                _id: new Realm.BSON.ObjectId(),
                expenseId: eId,
                memberId: new Realm.BSON.ObjectId(s.memberId),
                amount: s.amount,
              });
            });
        }
      });

      // Payments — skip if already exists (v2 payload only)
      payload.payments?.forEach((p: any) => {
        const pId = new Realm.BSON.ObjectId(p.id);
        if (!realm.objectForPrimaryKey('Payment', pId)) {
          realm.create('Payment', {
            _id: pId,
            groupId: existingId,
            fromMemberId: new Realm.BSON.ObjectId(p.from),
            toMemberId: new Realm.BSON.ObjectId(p.to),
            amount: p.amount,
            date: new Date(p.date),
          });
        }
      });
    });
  };

  const importGroup = (json: string) => {
    try {
      const payload = JSON.parse(json);

      if ((!payload.v || payload.v < 1) || !payload.group || !payload.members) {
        throw new Error('Invalid QR code.');
      }

      const existingId = new Realm.BSON.ObjectId(payload.group.id);
      const existing = realm.objectForPrimaryKey('Group', existingId);

      if (existing) {
        // Group already exists — offer to sync
        showAlert({
          title: 'Sync group?',
          message: `"${payload.group.name}" is already in your groups. Sync to get the latest expenses and payments from this QR?`,
          buttons: [
            { text: 'Cancel', style: 'cancel', onPress: () => setScanned(false) },
            {
              text: 'Sync',
              style: 'default',
              onPress: () => {
                applyPayload(payload, existingId, true);
                showAlert({
                  title: 'Synced!',
                  message: `"${payload.group.name}" is up to date.`,
                  buttons: [{
                    text: 'View Group',
                    style: 'default',
                    onPress: () => navigation.replace('Group', { groupId: payload.group.id }),
                  }],
                });
              },
            },
          ],
        });
        return;
      }

      // Fresh import
      applyPayload(payload, existingId, false);
      showAlert({
        title: 'Imported!',
        message: `"${payload.group.name}" was added to your groups.`,
        buttons: [{
          text: 'View Group',
          style: 'default',
          onPress: () => navigation.replace('Group', { groupId: payload.group.id }),
        }],
      });
    } catch {
      showAlert({ title: 'Invalid QR', message: 'This QR code is not a valid Baagam group.' });
      setScanned(false);
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      if (scanned || !codes[0]?.value) return;
      setScanned(true);
      importGroup(codes[0].value);
    },
  });

  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Camera permission is required to scan QR codes.</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>No camera found on this device.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={!scanned}
        codeScanner={codeScanner}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.scanArea}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        <Text style={styles.hint}>
          {scanned ? 'Processing...' : 'Point at a SplitLite QR code'}
        </Text>
      </View>
    </View>
  );
}

const CORNER = 24;
const BORDER = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permText: {
    color: colors.text2,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  backBtn: {
    backgroundColor: colors.surface2,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backBtnText: {
    color: colors.text,
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 16,
  },
  scanArea: {
    width: 240,
    height: 240,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: colors.accent,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: BORDER,
    borderLeftWidth: BORDER,
    borderTopLeftRadius: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: BORDER,
    borderRightWidth: BORDER,
    borderTopRightRadius: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: BORDER,
    borderLeftWidth: BORDER,
    borderBottomLeftRadius: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: BORDER,
    borderRightWidth: BORDER,
    borderBottomRightRadius: 4,
  },
  hint: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 32,
    fontSize: 14,
  },
});
