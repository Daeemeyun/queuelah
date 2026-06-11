import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { Eatery } from '@types/eatery';
import { QueueStatus } from '@types/queue';
import { resolveQueueDisplay } from '@lib/busyness';

interface Props {
  eatery: Eatery;
  status?: QueueStatus;
  onPress: () => void;
}

export function MapMarker({ eatery, status, onPress }: Props) {
  const display = resolveQueueDisplay(eatery, status);
  const color = display.color;
  // Estimated markers are prefixed "~" so an estimate never looks like a live report.
  const label = display.source === 'live' && display.estimatedMinutes
    ? `~${Math.round(display.estimatedMinutes)}m`
    : display.source === 'estimated'
      ? `~${display.shortLabel}`
      : display.shortLabel;

  return (
    <Marker
      coordinate={{ latitude: eatery.latitude, longitude: eatery.longitude }}
      onPress={onPress}
      tracksViewChanges={false}
    >
      <View style={styles.wrap}>
        <View style={[
          styles.bubble,
          { backgroundColor: color },
          display.source === 'estimated' && styles.bubbleEstimated,
        ]}>
          <Text style={styles.label}>{label}</Text>
        </View>
        <View style={[styles.tail, { borderTopColor: color }]} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  bubble: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  bubbleEstimated: { opacity: 0.92, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderStyle: 'dashed' },
  label: { color: '#fff', fontSize: 11, fontWeight: '700' },
  tail: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopWidth: 7, marginTop: -1,
  },
});
