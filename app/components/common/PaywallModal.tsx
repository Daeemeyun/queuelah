import React from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '@constants/colors';

const PRO_FEATURES = [
  { emoji: '📊', label: 'Queue trend charts',        sub: 'See busy hours for any eatery' },
  { emoji: '🏆', label: 'Highlighted leaderboard',   sub: 'Stand out with a gold rank badge' },
  { emoji: '🖼️', label: 'Avatar frames',             sub: 'Gold, glow, and gradient borders' },
  { emoji: '🎨', label: 'Custom username colour',    sub: 'Gold, blue, purple, or red' },
  { emoji: '⭐', label: 'Exclusive PRO badge',       sub: 'Shown on your profile and posts' },
  { emoji: '🏪', label: 'Eatery owner tools',        sub: 'Claim and manage your listing' },
];

interface Props {
  visible: boolean;
  featureName?: string;   // e.g. "Queue Trends"
  onClose: () => void;
}

export function PaywallModal({ visible, featureName, onClose }: Props) {
  const navigation = useNavigation<any>();

  function handleUpgrade() {
    onClose();
    navigation.navigate('GoPro');
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={styles.sheet}>
        {/* Crown + title */}
        <Text style={styles.crown}>👑</Text>
        <Text style={styles.title}>QueueLah Pro</Text>
        {featureName ? (
          <Text style={styles.subtitle}>
            <Text style={styles.featureName}>{featureName}</Text> is a Pro feature.{'\n'}
            Upgrade to unlock it and more.
          </Text>
        ) : (
          <Text style={styles.subtitle}>Unlock the full QueueLah experience.</Text>
        )}

        {/* Feature list */}
        <View style={styles.featureList}>
          {PRO_FEATURES.map(f => (
            <View key={f.label} style={styles.featureRow}>
              <Text style={styles.featureEmoji}>{f.emoji}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureSub}>{f.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.upgradeBtn} onPress={handleUpgrade} activeOpacity={0.85}>
          <Text style={styles.upgradeBtnText}>See QueueLah Pro →</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={styles.dismissBtn}>
          <Text style={styles.dismissText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.card,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 40,
    alignItems: 'center', gap: 8,
    borderTopWidth: 1, borderColor: Colors.border,
  },

  crown:    { fontSize: 40, marginBottom: 4 },
  title:    { color: Colors.accentYellow, fontSize: 22, fontWeight: '800' },
  subtitle: { color: Colors.subtext, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  featureName: { color: Colors.text, fontWeight: '700' },

  featureList: { width: '100%', gap: 12, marginTop: 8, marginBottom: 8 },
  featureRow:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureEmoji: { fontSize: 22, width: 32, textAlign: 'center' },
  featureText:  { flex: 1 },
  featureLabel: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  featureSub:   { color: Colors.subtext, fontSize: 12, marginTop: 1 },

  upgradeBtn: {
    backgroundColor: Colors.accentYellow,
    borderRadius: 16, paddingVertical: 16,
    width: '100%', alignItems: 'center', marginTop: 8,
  },
  upgradeBtnText: { color: '#000', fontWeight: '800', fontSize: 16 },

  dismissBtn: { paddingVertical: 10 },
  dismissText: { color: Colors.subtext, fontSize: 14 },
});
