import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@constants/colors';
import { Analytics } from '@lib/analytics';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '🍜',
    title: 'No more wasted trips\nto the hawker centre.',
    body: 'QueueLah! shows real-time queue times at hawker centres, restaurants, and cafes across Singapore — powered by people like you.',
  },
  {
    emoji: '⚡',
    title: 'Report a queue\nin 2 taps.',
    body: 'Just tap Short, Medium, or Long. No sign-up needed. Your report helps the whole community make smarter lunch decisions.',
  },
  {
    emoji: '🏆',
    title: 'Earn badges,\nbuild streaks.',
    body: 'Create a free account to earn points and badges for every report. Become the top Hawker Hero in your neighbourhood.',
  },
];

export function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  async function finish() {
    await AsyncStorage.setItem('onboarding_done', 'true');
    Analytics.track('onboarding_completed');
    navigation.replace('Main');
  }

  function next() {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
      setActiveIndex(activeIndex + 1);
    } else {
      finish();
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={e => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveIndex(index);
        }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.btn} onPress={next} activeOpacity={0.85}>
          <Text style={styles.btnText}>
            {activeIndex === SLIDES.length - 1 ? "Let's Go! 🚀" : 'Next →'}
          </Text>
        </TouchableOpacity>
        {activeIndex < SLIDES.length - 1 && (
          <TouchableOpacity onPress={finish} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  emoji: { fontSize: 80, marginBottom: 32 },
  title: {
    fontWeight: '800',
    fontSize: 28,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    color: Colors.subtext,
    textAlign: 'center',
    lineHeight: 22,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 32,
  },
  dot: {
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.accent,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  btn: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: { color: '#000', fontWeight: '800', fontSize: 16 },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { color: Colors.subtext, fontSize: 14 },
});
