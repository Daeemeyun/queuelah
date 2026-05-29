import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { X } from 'lucide-react-native';

import { Colors } from '@constants/colors';
import { Analytics } from '@lib/analytics';
import { useEffect } from 'react';

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

  useEffect(() => {
    Analytics.track('go_pro_screen_viewed');
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <X size={20} color={Colors.subtext} />
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

        {/* Coming Soon card — no purchase button */}
        <View style={styles.comingSoonCard}>
          <Text style={styles.comingSoonTitle}>Launching Soon</Text>
          <Text style={styles.comingSoonDesc}>
            Pro subscriptions are coming in a future update. All features are free while we're in beta — enjoy them on us!
          </Text>
        </View>
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
  backBtn: { padding: 8 },

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

  comingSoonCard: {
    backgroundColor: Colors.card2,
    borderRadius: 16, padding: 20, gap: 8,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center',
  },
  comingSoonTitle: { color: Colors.accentYellow, fontSize: 16, fontWeight: '700' },
  comingSoonDesc:  { color: Colors.subtext, fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
