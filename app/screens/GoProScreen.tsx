import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Colors } from '@constants/colors';
import { usePremium } from '@hooks/usePremium';

const FEATURES = [
  {
    emoji: '📊',
    title: 'Queue Trend Charts',
    description: 'See historical busy hours for any eatery. Plan your meals around the crowd.',
  },
  {
    emoji: '🏆',
    title: 'Highlighted Leaderboard Rank',
    description: 'Stand out with a gold Pro badge next to your rank on the city-wide leaderboard.',
  },
  {
    emoji: '🖼️',
    title: 'Avatar Frames',
    description: 'Deck out your profile with gold, animated glow, or gradient avatar borders.',
  },
  {
    emoji: '🎨',
    title: 'Custom Username Colour',
    description: 'Choose your colour — gold, blue, purple, or red — shown on posts and your profile.',
  },
  {
    emoji: '⭐',
    title: 'Exclusive PRO Badge',
    description: 'A shiny PRO badge displayed on your profile and next to your name in the forum.',
  },
];

export function GoProScreen() {
  const navigation = useNavigation<any>();
  const { isPro } = usePremium();

  function handleUpgrade() {
    Alert.alert(
      'Coming Soon',
      'In-app purchases are coming soon. Stay tuned for QueueLah Pro!',
      [{ text: 'OK' }],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.crown}>👑</Text>
          <Text style={styles.heroTitle}>QueueLah Pro</Text>
          <Text style={styles.heroSubtitle}>
            The full QueueLah experience — for power users who take their makan seriously.
          </Text>
          {isPro && (
            <View style={styles.alreadyProBadge}>
              <Text style={styles.alreadyProText}>✓ You're already on Pro</Text>
            </View>
          )}
        </View>

        {/* Feature list */}
        <View style={styles.featureList}>
          {FEATURES.map(f => (
            <View key={f.title} style={styles.featureCard}>
              <Text style={styles.featureEmoji}>{f.emoji}</Text>
              <View style={styles.featureBody}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pricing */}
        <View style={styles.pricingCard}>
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>QueueLah Pro</Text>
            <View style={styles.pricingBadge}>
              <Text style={styles.pricingBadgeText}>Coming Soon</Text>
            </View>
          </View>
          <Text style={styles.pricingDesc}>
            Payment integration is on the way. We'll notify you when Pro is available.
          </Text>
        </View>

        {/* CTA */}
        {!isPro ? (
          <TouchableOpacity style={styles.upgradeBtn} onPress={handleUpgrade} activeOpacity={0.85}>
            <Text style={styles.upgradeBtnText}>👑  Upgrade to Pro</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.activeCard}>
            <Text style={styles.activeText}>
              You have access to all Pro features. Thank you for supporting QueueLah! 🙏
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
    alignItems: 'flex-end',
  },
  backBtn:  { padding: 8 },
  backText: { color: Colors.subtext, fontSize: 18 },

  scroll:        { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48, gap: 20 },

  hero: { alignItems: 'center', gap: 10, paddingVertical: 12 },
  crown: { fontSize: 56 },
  heroTitle: {
    color: Colors.accentYellow, fontSize: 28, fontWeight: '900', letterSpacing: 0.5,
  },
  heroSubtitle: {
    color: Colors.subtext, fontSize: 15, textAlign: 'center', lineHeight: 22,
  },
  alreadyProBadge: {
    backgroundColor: 'rgba(255,214,10,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,214,10,0.4)',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginTop: 4,
  },
  alreadyProText: { color: Colors.accentYellow, fontWeight: '700', fontSize: 14 },

  featureList: { gap: 12 },
  featureCard: {
    flexDirection: 'row', gap: 16, alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  featureEmoji: { fontSize: 28, width: 36, textAlign: 'center' },
  featureBody:  { flex: 1, gap: 4 },
  featureTitle: { color: Colors.text,    fontSize: 15, fontWeight: '700' },
  featureDesc:  { color: Colors.subtext, fontSize: 13, lineHeight: 18 },

  pricingCard: {
    backgroundColor: Colors.card2,
    borderRadius: 16, padding: 20, gap: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  pricingRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pricingLabel:     { color: Colors.text, fontSize: 17, fontWeight: '700' },
  pricingBadge:     { backgroundColor: 'rgba(255,214,10,0.15)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  pricingBadgeText: { color: Colors.accentYellow, fontSize: 12, fontWeight: '600' },
  pricingDesc:      { color: Colors.subtext, fontSize: 13, lineHeight: 18 },

  upgradeBtn: {
    backgroundColor: Colors.accentYellow,
    borderRadius: 16, paddingVertical: 18,
    alignItems: 'center',
    shadowColor: Colors.accentYellow,
    shadowOpacity: 0.3, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  upgradeBtnText: { color: '#000', fontWeight: '900', fontSize: 17 },

  activeCard: {
    backgroundColor: 'rgba(255,214,10,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,214,10,0.2)',
    borderRadius: 14, padding: 18,
  },
  activeText: { color: Colors.subtext, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
