import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  size?: 'sm' | 'md';
}

export function ProBadge({ size = 'sm' }: Props) {
  const isMd = size === 'md';
  return (
    <View style={[styles.badge, isMd && styles.badgeMd]}>
      <Text style={[styles.text, isMd && styles.textMd]}>PRO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#FFD60A',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  text: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  textMd: {
    fontSize: 11,
  },
});
