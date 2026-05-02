import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/color';
import { useUser } from '../../context/UserContext';

export default function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { setUserName } = useUser();
  const [name, setName] = useState('');

  const handleContinue = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await setUserName(trimmed);
    navigation.replace('Home');
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Image
          source={require('../../assets/baagam-icon.png')}
          style={styles.logoMark}
          resizeMode="contain"
        />

        <Text style={styles.title}>Welcome to{'\n'}Baagam</Text>
        <Text style={styles.subtitle}>What should we call you?</Text>

        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={colors.text3}
          value={name}
          onChangeText={setName}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleContinue}
          maxLength={40}
        />

        <TouchableOpacity
          style={[styles.btn, !name.trim() && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!name.trim()}
        >
          <Text style={styles.btnText}>Get Started</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  logoMark: {
    width: 80,
    height: 80,
    marginBottom: 32,
    borderRadius: 20,
    overflow: 'hidden',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
    lineHeight: 42,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text2,
    marginBottom: 32,
  },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: 16,
    padding: 16,
    fontSize: 18,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  btn: {
    backgroundColor: colors.accent,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
