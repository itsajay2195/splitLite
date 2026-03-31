import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme/color';

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertOptions = {
  title: string;
  message?: string;
  buttons?: AlertButton[];
};

type AlertContextType = {
  showAlert: (options: AlertOptions) => void;
};

const AlertContext = createContext<AlertContextType | null>(null);

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlert must be used within AlertProvider');
  return ctx;
}

export default function AlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions>({ title: '' });
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  const showAlert = useCallback((opts: AlertOptions) => {
    setOptions(opts);
    setVisible(true);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 260 }),
    ]).start();
  }, [opacity, scale]);

  const dismiss = (onPress?: () => void) => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.94, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      opacity.setValue(0);
      scale.setValue(0.92);
      onPress?.();
    });
  };

  const buttons: AlertButton[] = options.buttons ?? [{ text: 'OK', style: 'default' }];

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
        <Animated.View style={[styles.backdrop, { opacity }]}>
          <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
            <Text style={styles.title}>{options.title}</Text>

            {options.message ? (
              <Text style={styles.message}>{options.message}</Text>
            ) : null}

            <View style={[styles.buttonRow, buttons.length > 2 && styles.buttonCol]}>
              {buttons.map((btn, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.button,
                    buttons.length === 2 && styles.buttonHalf,
                    btn.style === 'cancel' && styles.buttonCancel,
                    btn.style === 'destructive' && styles.buttonDestructive,
                    btn.style !== 'cancel' && btn.style !== 'destructive' && styles.buttonPrimary,
                  ]}
                  onPress={() => dismiss(btn.onPress)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      btn.style === 'cancel' && styles.buttonTextCancel,
                      btn.style === 'destructive' && styles.buttonTextDestructive,
                      btn.style !== 'cancel' && btn.style !== 'destructive' && styles.buttonTextPrimary,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </AlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: colors.surface2,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  message: {
    color: colors.text2,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  buttonCol: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonHalf: {
    flex: 1,
  },
  buttonPrimary: {
    backgroundColor: colors.accent,
  },
  buttonCancel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDestructive: {
    backgroundColor: 'rgba(255,74,107,0.15)',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonTextPrimary: {
    color: '#000',
  },
  buttonTextCancel: {
    color: colors.text2,
  },
  buttonTextDestructive: {
    color: colors.danger,
  },
});
