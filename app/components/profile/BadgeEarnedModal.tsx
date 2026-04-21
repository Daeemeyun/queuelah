import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal,
  TouchableOpacity, Animated, Easing, Pressable,
} from 'react-native';
import { Colors } from '@constants/colors';

interface Props {
  badge: { icon: string; name: string; description: string } | null;
  onClose: () => void;
}

export function BadgeEarnedModal({ badge, onClose }: Props) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!badge) return;
    scaleAnim.setValue(0);
    opacityAnim.setValue(0);
    bounceAnim.setValue(0);

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1, duration: 200, useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1, friction: 6, tension: 100, useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -12, duration: 150, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(bounceAnim, { toValue: 4,   duration: 100, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: -6,  duration: 80,  useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0,   duration: 60,  useNativeDriver: true }),
      ]).start();
    });
  }, [badge]);

  if (!badge) return null;

  return (
    <Modal transparent animationType="none" visible={!!badge} onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[
          styles.card,
          { transform: [{ scale: scaleAnim }], opacity: opacityAnim }
        ]}>
          <View style={styles.glowRing}>
            <Animated.Text style={[
              styles.badgeIcon,
              { transform: [{ translateY: bounceAnim }] }
            ]}>
              {badge.icon}
            </Animated.Text>
          </View>
          <Text style={styles.earnedLabel}>Badge Unlocked!</Text>
          <Text style={styles.badgeName}>{badge.name}</Text>
          <Text style={styles.badgeDesc}>{badge.description}</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Awesome! 🎉</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.accentYellow,
    width: '100%',
  },
  glowRing: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,214,10,0.1)',
    borderWidth: 2, borderColor: 'rgba(255,214,10,0.4)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  badgeIcon: { fontSize: 52 },
  earnedLabel: {
    fontSize: 12, fontWeight: '700',
    color: Colors.accentYellow,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  badgeName: {
    fontSize: 24, fontWeight: '800',
    color: Colors.text, textAlign: 'center',
  },
  badgeDesc: {
    fontSize: 14, color: Colors.subtext,
    textAlign: 'center', lineHeight: 20,
    marginBottom: 8,
  },
  closeBtn: {
    backgroundColor: Colors.accentYellow,
    borderRadius: 14, paddingVertical: 12,
    paddingHorizontal: 32, marginTop: 8,
  },
  closeBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
});
