import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/color';

type Props = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  backLabel?: string;
  right?: React.ReactNode;
};

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  backLabel = 'Back',
  right,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 20 }}>
        <Text style={styles.back}>‹ {backLabel}</Text>
      </TouchableOpacity>

      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {right && <View style={styles.right}>{right}</View>}
      </View>

      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.bg,
  },
  back: {
    color: colors.text2,
    fontSize: 15,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    flex: 1,
  },
  right: {
    marginLeft: 12,
  },
  subtitle: {
    color: colors.text2,
    fontSize: 12,
    marginTop: 4,
  },
});
