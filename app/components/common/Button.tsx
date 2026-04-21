import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@constants/colors';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: ViewStyle;
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', style, disabled }: Props) {
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], disabled && styles.disabled, style]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <Text style={[styles.text, variant === 'ghost' && styles.ghostText]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center' },
  primary: { backgroundColor: Colors.accent },
  secondary: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
  text: { color: '#000', fontWeight: '700', fontSize: 15 },
  ghostText: { color: Colors.subtext },
});
