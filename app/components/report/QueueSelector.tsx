import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { QueueLevel } from '@types/queue';
import { Colors } from '@constants/colors';

interface Option { level: QueueLevel; emoji: string; label: string; sub: string; }

const OPTIONS: Option[] = [
  { level: 'short',  emoji: '😊', label: 'Short',  sub: '< 10 min' },
  { level: 'medium', emoji: '😐', label: 'Medium', sub: '10–30 min' },
  { level: 'long',   emoji: '😰', label: 'Long',   sub: '> 30 min' },
];

const SELECTED_BG: Record<QueueLevel, string> = {
  short:  Colors.shortBg,
  medium: Colors.mediumBg,
  long:   Colors.longBg,
};
const SELECTED_BORDER: Record<QueueLevel, string> = {
  short:  Colors.queueShort,
  medium: Colors.queueMedium,
  long:   Colors.queueLong,
};

interface Props {
  selected: QueueLevel | null;
  onSelect: (level: QueueLevel) => void;
}

export function QueueSelector({ selected, onSelect }: Props) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => {
        const isSelected = selected === opt.level;
        return (
          <TouchableOpacity
            key={opt.level}
            style={[
              styles.option,
              isSelected && {
                borderColor: SELECTED_BORDER[opt.level],
                backgroundColor: SELECTED_BG[opt.level],
              },
            ]}
            onPress={() => onSelect(opt.level)}
            activeOpacity={0.8}
          >
            <Text style={styles.emoji}>{opt.emoji}</Text>
            <Text style={[styles.label, isSelected && { color: SELECTED_BORDER[opt.level] }]}>
              {opt.label}
            </Text>
            <Text style={styles.sub}>{opt.sub}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  option: {
    flex: 1, backgroundColor: Colors.card,
    borderWidth: 2, borderColor: Colors.border,
    borderRadius: 14, padding: 12, alignItems: 'center', gap: 4,
  },
  emoji: { fontSize: 28 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.text },
  sub:   { fontSize: 10, color: Colors.subtext },
});
