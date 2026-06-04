import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/color';
import { signInWithGoogle } from '../../utils/firebaseAuth';
import { setUserName } from '../../utils/userStorage';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await signInWithGoogle();
      if (user.displayName) {
        setUserName(user.displayName);
      }
      navigation.replace('Home');
    } catch (e: any) {
      if (e?.code !== 'SIGN_IN_CANCELLED') {
        setError('Sign in failed. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleGuest = () => {
    navigation.replace('Onboarding');
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>Baagam</Text>
        <Text style={styles.tagline}>Split expenses with friends</Text>
      </View>

      <View style={styles.card}>
        <TouchableOpacity
          style={styles.googleBtn}
          onPress={handleGoogleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              <Image
                source={{ uri: 'https://www.google.com/favicon.ico' }}
                style={styles.googleIcon}
              />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.guestBtn}
          onPress={handleGuest}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.guestBtnText}>Continue as guest</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Sign in to access your groups across devices
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    padding: 24,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: -1,
  },
  tagline: {
    color: colors.text2,
    fontSize: 15,
    marginTop: 6,
  },
  card: {
    backgroundColor: colors.surface2,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  googleBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleIcon: {
    width: 18,
    height: 18,
  },
  googleBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.text3,
    fontSize: 12,
  },
  guestBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  guestBtnText: {
    color: colors.text2,
    fontWeight: '600',
    fontSize: 15,
  },
  hint: {
    color: colors.text3,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
