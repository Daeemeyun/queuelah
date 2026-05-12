import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import { supabase } from '@lib/supabase';
import { useAuth } from '@hooks/useAuth';
import { useAuthStore } from '@store/authStore';
import { useEateries } from '@hooks/useEateries';
import { QueueSelector } from '@components/report/QueueSelector';
import { BadgeEarnedModal } from '@components/profile/BadgeEarnedModal';
import { Colors } from '@constants/colors';
import { QueueLevel } from '@types/queue';
import { getReportExpiryTime } from '@lib/helpers';
import { awardPointsForReport, BadgeResult } from '@lib/gamification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '@constants/config';

const SLIDER_BOUNDS: Record<QueueLevel, { min: number; max: number }> = {
  short:  { min: 0,  max: 10 },
  medium: { min: 10, max: 30 },
  long:   { min: 30, max: 90 },
};

export function ReportScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { eateryId, eateryName, stallId, stallName } = route.params ?? {};

  const { user, isGuest } = useAuth();
  const { setUser } = useAuthStore();
  const { eateries } = useEateries();

  const [selectedLevel, setSelectedLevel] = useState<QueueLevel | null>(null);
  const [minutes, setMinutes] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [selectedEateryId, setSelectedEateryId] = useState<string>(eateryId ?? '');
  const [selectedEateryName, setSelectedEateryName] = useState<string>(eateryName ?? '');
  const [celebratingBadge, setCelebratingBadge] = useState<BadgeResult | null>(null);
  const [badgeQueue, setBadgeQueue] = useState<BadgeResult[]>([]);

  // Show badges one at a time after they're queued
  useEffect(() => {
    if (badgeQueue.length > 0 && !celebratingBadge) {
      setCelebratingBadge(badgeQueue[0]);
      setBadgeQueue(prev => prev.slice(1));
    }
  }, [badgeQueue, celebratingBadge]);

  useEffect(() => {
    if (!selectedLevel) return;
    const bounds = SLIDER_BOUNDS[selectedLevel];
    if (minutes < bounds.min || minutes > bounds.max) setMinutes(bounds.min);
  }, [selectedLevel]);

  const sliderBounds = selectedLevel ? SLIDER_BOUNDS[selectedLevel] : { min: 0, max: 90 };

  async function handleSubmit() {
    if (!selectedLevel) {
      Alert.alert('Select queue level', 'Please tap Short, Medium, or Long first.');
      return;
    }
    if (!selectedEateryId) {
      Alert.alert('Select eatery', 'Please select an eatery to report on.');
      return;
    }

    if (isGuest) {
      const cooldownKey = `cooldown_${selectedEateryId}_${stallId ?? 'eatery'}`;
      const lastReport = await AsyncStorage.getItem(cooldownKey);
      if (lastReport) {
        const elapsed = Date.now() - parseInt(lastReport);
        if (elapsed < Config.REPORT_COOLDOWN_MS) {
          const remaining = Math.ceil((Config.REPORT_COOLDOWN_MS - elapsed) / 60000);
          Alert.alert('Too soon! 🛑', `Please wait ${remaining} more minute${remaining !== 1 ? 's' : ''}.`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('queue_reports').insert({
        eatery_id: selectedEateryId,
        stall_id: stallId ?? null,
        level: selectedLevel,
        estimated_minutes: minutes > 0 ? minutes : null,
        user_id: user?.id ?? null,
        device_id: isGuest ? await getDeviceId() : null,
        expires_at: getReportExpiryTime(),
      });

      if (error) throw error;

      if (isGuest) {
        await AsyncStorage.setItem(
          `cooldown_${selectedEateryId}_${stallId ?? 'eatery'}`,
          Date.now().toString()
        );
      }

      let successMessage = 'Thanks! Your report helps everyone.\nSign up to earn points and badges!';

      if (user) {
        const { pointsAwarded, newStreak, streakBroken, newBadges } =
          await awardPointsForReport(user.id);

        // Refresh user profile
        const { data: updatedProfile } = await supabase
          .from('user_profiles').select('*').eq('id', user.id).single();
        if (updatedProfile) setUser(updatedProfile as any);

        if (streakBroken) {
          successMessage = `+${pointsAwarded} pts! Streak reset to 1 day. Stay consistent! 💪`;
        } else if (newStreak > 1) {
          successMessage = `+${pointsAwarded} pts earned! 🔥 ${newStreak}-day streak!`;
        } else {
          successMessage = `+${pointsAwarded} pts earned! Keep it up 🍜`;
        }

        // Queue badge celebrations
        if (newBadges.length > 0) {
          // Show success alert first, then badges
          Alert.alert('✅ Report submitted!', successMessage, [{
            text: 'OK',
            onPress: () => setBadgeQueue(newBadges),
          }]);
          return;
        }
      }

      Alert.alert('✅ Report submitted!', successMessage, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Report Queue</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.locationCard}>
            <Text style={styles.locationIcon}>📍</Text>
            <View>
              <Text style={styles.locationName}>{selectedEateryName || 'Select an eatery below'}</Text>
              {stallName && <Text style={styles.locationSub}>{stallName}</Text>}
            </View>
          </View>

          {!selectedEateryId && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>SELECT EATERY</Text>
              {[...eateries].sort((a, b) => a.name.localeCompare(b.name)).map(e => (
                <TouchableOpacity
                  key={e.id}
                  style={[styles.eateryRow, selectedEateryId === e.id && styles.eateryRowSelected]}
                  onPress={() => { setSelectedEateryId(e.id); setSelectedEateryName(e.name); }}
                >
                  <Text style={styles.eateryRowName}>{e.name}</Text>
                  <Text style={styles.eateryRowType}>{e.type.replace('_', ' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>STEP 1 — HOW'S THE QUEUE?</Text>
            <QueueSelector selected={selectedLevel} onSelect={setSelectedLevel} />
          </View>

          {selectedLevel && (
            <View style={styles.sliderCard}>
              <Text style={styles.sectionLabel}>STEP 2 — ESTIMATE WAIT TIME (OPTIONAL)</Text>
              <View style={styles.rangeHint}>
                <Text style={styles.rangeHintText}>
                  {selectedLevel === 'short'  && '🟢 Short queue: 0–10 minutes'}
                  {selectedLevel === 'medium' && '🟡 Medium queue: 10–30 minutes'}
                  {selectedLevel === 'long'   && '🔴 Long queue: 30–90 minutes'}
                </Text>
              </View>
              <Text style={styles.minutesVal}>
                {minutes === sliderBounds.min && selectedLevel === 'short' ? 'No queue' : `~${minutes} min`}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={sliderBounds.min}
                maximumValue={sliderBounds.max}
                step={5}
                value={minutes}
                onValueChange={setMinutes}
                minimumTrackTintColor={
                  selectedLevel === 'short' ? Colors.queueShort :
                  selectedLevel === 'medium' ? Colors.queueMedium : Colors.queueLong
                }
                maximumTrackTintColor={Colors.border}
                thumbTintColor={
                  selectedLevel === 'short' ? Colors.queueShort :
                  selectedLevel === 'medium' ? Colors.queueMedium : Colors.queueLong
                }
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>{sliderBounds.min} min</Text>
                <Text style={styles.sliderLabel}>{sliderBounds.max} min</Text>
              </View>
            </View>
          )}

          {!isGuest && (
            <View style={styles.pointsPreview}>
              <Text style={styles.pointsPreviewText}>
                🏆 You'll earn +{Config.POINTS_REPORT} pts{' '}
                <Text style={styles.pointsBonus}>(+{Config.POINTS_FIRST_DAILY} bonus if first today)</Text>
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, (!selectedLevel || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!selectedLevel || submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color="#000" />
              : <Text style={styles.submitText}>🚀 Submit Report</Text>
            }
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            {isGuest
              ? 'Reporting anonymously · Reports expire after 30 min'
              : `Reporting as ${user?.username}`
            }
          </Text>
        </View>
      </ScrollView>

      {/* Badge celebration — shows after successful report */}
      <BadgeEarnedModal
        badge={celebratingBadge}
        onClose={() => {
          setCelebratingBadge(null);
          // If no more badges to show, go back
          if (badgeQueue.length === 0) navigation.goBack();
        }}
      />
    </SafeAreaView>
  );
}

async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem('device_id');
  if (!id) {
    id = 'device_' + Math.random().toString(36).substr(2, 12);
    await AsyncStorage.setItem('device_id', id);
  }
  return id;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 8 },
  backBtn: {
    width: 36, height: 36, backgroundColor: Colors.card,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  backText: { color: Colors.text, fontSize: 18 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text },
  body: { padding: 16, gap: 16 },
  locationCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  locationIcon: { fontSize: 22 },
  locationName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  locationSub: { fontSize: 11, color: Colors.subtext, marginTop: 2 },
  section: { gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.subtext, letterSpacing: 0.5, marginBottom: 4 },
  eateryRow: {
    backgroundColor: Colors.card, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  eateryRowSelected: { borderColor: Colors.accent },
  eateryRowName: { fontSize: 13, fontWeight: '600', color: Colors.text },
  eateryRowType: { fontSize: 11, color: Colors.subtext, marginTop: 2, textTransform: 'capitalize' },
  sliderCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border, gap: 8,
  },
  rangeHint: { backgroundColor: Colors.card2, borderRadius: 8, padding: 8, alignItems: 'center' },
  rangeHintText: { fontSize: 12, color: Colors.subtext },
  minutesVal: { fontSize: 36, fontWeight: '800', color: Colors.accent, textAlign: 'center' },
  slider: { width: '100%', height: 40 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { fontSize: 10, color: Colors.subtext },
  pointsPreview: {
    backgroundColor: 'rgba(255,107,53,0.08)', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,107,53,0.2)',
  },
  pointsPreviewText: { fontSize: 13, color: Colors.accent, textAlign: 'center', fontWeight: '600' },
  pointsBonus: { fontWeight: '400', color: Colors.subtext },
  submitBtn: {
    backgroundColor: Colors.accent, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: Colors.accent, shadowOpacity: 0.35,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: { color: '#000', fontWeight: '800', fontSize: 16 },
  disclaimer: { fontSize: 11, color: Colors.subtext, textAlign: 'center', marginTop: 4 },
});
