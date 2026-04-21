import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Pressable, ScrollView,
} from 'react-native';
import { Eatery } from '@types/eatery';
import { QueueStatus } from '@types/queue';
import { Colors } from '@constants/colors';
import { queueLevelLabel, getQueueColor, getFreshnessLabel } from '@lib/helpers';
import { StatusDot } from '@components/common/StatusDot';

interface Props {
  eatery: Eatery | null;
  status?: QueueStatus;
  onClose: () => void;
  onReport: () => void;
  onViewDetail: () => void;
}

export function EateryBottomSheet({ eatery, status, onClose, onReport, onViewDetail }: Props) {
  if (!eatery) return null;

  const level = status?.level ?? 'no_data';
  const queueColor = getQueueColor(level);

  return (
    <Modal
      visible={!!eatery}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Handle bar */}
        <View style={styles.handle} />

        {/* Eatery info */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.name}>{eatery.name}</Text>
            <Text style={styles.type}>
              {eatery.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              {' · '}{eatery.address.split(',')[0]}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Queue status */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <StatusDot level={level} size={12} />
              <Text style={[styles.statusText, { color: queueColor }]}>
                {queueLevelLabel(level)}
              </Text>
            </View>
            {status?.latest_report_at && (
              <Text style={styles.freshness}>
                🕐 {getFreshnessLabel(status.latest_report_at)}
              </Text>
            )}
          </View>

          {/* Freshness bar */}
          <View style={styles.freshnessBarBg}>
            <View style={[
              styles.freshnessBarFill,
              {
                width: `${status?.freshness_percent ?? 0}%` as any,
                backgroundColor: queueColor,
              }
            ]} />
          </View>

          <View style={styles.statusMeta}>
            {status?.estimated_minutes ? (
              <Text style={styles.metaText}>
                ~{Math.round(status.estimated_minutes)} min wait
              </Text>
            ) : (
              <Text style={styles.metaText}>
                {status ? `${status.report_count} report${status.report_count !== 1 ? 's' : ''}` : 'No recent reports'}
              </Text>
            )}
            {eatery.opening_hours && (
              <Text style={styles.metaText}>🕗 {eatery.opening_hours}</Text>
            )}
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.reportBtn}
            onPress={onReport}
            activeOpacity={0.85}
          >
            <Text style={styles.reportBtnText}>+ Report Queue</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.detailBtn}
            onPress={onViewDetail}
            activeOpacity={0.85}
          >
            <Text style={styles.detailBtnText}>View Details →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerLeft: { flex: 1, marginRight: 12 },
  name: {
    fontSize: 18, fontWeight: '800',
    color: Colors.text, marginBottom: 3,
  },
  type: { fontSize: 12, color: Colors.subtext },
  closeBtn: {
    width: 28, height: 28,
    backgroundColor: Colors.card2,
    borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: Colors.subtext, fontSize: 13 },

  statusCard: {
    backgroundColor: Colors.card2,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { fontSize: 15, fontWeight: '700' },
  freshness: { fontSize: 11, color: Colors.subtext },
  freshnessBarBg: {
    backgroundColor: Colors.border,
    borderRadius: 4, height: 5,
    marginBottom: 10, overflow: 'hidden',
  },
  freshnessBarFill: { height: '100%', borderRadius: 4 },
  statusMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: { fontSize: 11, color: Colors.subtext },

  actions: { flexDirection: 'row', gap: 10 },
  reportBtn: {
    flex: 1,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  reportBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  detailBtn: {
    flex: 1,
    backgroundColor: Colors.card2,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailBtnText: { color: Colors.text, fontWeight: '600', fontSize: 14 },
});
