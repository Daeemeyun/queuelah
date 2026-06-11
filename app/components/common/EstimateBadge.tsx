import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { Colors } from '@constants/colors';
import { DisplaySource } from '@lib/busyness';

/**
 * Tiny pill that distinguishes an estimated busyness reading from a real
 * ("live") user report. Renders nothing for live/no_data so call sites can
 * drop it in unconditionally.
 */
export function EstimateBadge({ source, size = 'sm' }: { source: DisplaySource; size?: 'xs' | 'sm' }) {
  if (source !== 'estimated') return null;
  const xs = size === 'xs';
  return (
    <View style={[styles.pill, xs && styles.pillXs]}>
      <Text style={[styles.text, xs && styles.textXs]}>EST</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: 'rgba(142,142,147,0.16)',
    borderColor: 'rgba(142,142,147,0.35)',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  pillXs: { paddingHorizontal: 4, borderRadius: 4 },
  text: { fontSize: 9, fontWeight: '800', color: Colors.subtext, letterSpacing: 0.5 },
  textXs: { fontSize: 8 },
});
