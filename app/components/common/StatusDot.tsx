import React from 'react';
import { View, StyleSheet } from 'react-native';
import { QueueLevel } from '@types/queue';
import { getQueueColor } from '@lib/helpers';

interface Props {
  level: QueueLevel | 'no_data';
  size?: number;
}

export function StatusDot({ level, size = 10 }: Props) {
  const color = getQueueColor(level);
  return (
    <View style={[
      styles.dot,
      { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      level !== 'no_data' && { shadowColor: color, shadowOpacity: 0.7, shadowRadius: 4 }
    ]} />
  );
}

const styles = StyleSheet.create({
  dot: { shadowOffset: { width: 0, height: 0 } },
});
