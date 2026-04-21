import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '@hooks/useAuth';
import { useReviews } from '@hooks/useReviews';
import { Colors } from '@constants/colors';

// Lightweight review body filter (reuses pattern from contentFilter but body is optional)
function filterBody(body: string): string | null {
  const PROFANITY = [
    'fuck', 'shit', 'bitch', 'bastard', 'cunt', 'dick', 'cock',
    'pussy', 'whore', 'slut', 'piss', 'crap', 'motherfucker',
    'asshole', 'bullshit', 'jackass', 'prick', 'twat', 'wanker',
    'cb', 'ccb', 'knn', 'lj', 'nb',
  ];
  const lower = body.toLowerCase();
  for (const w of PROFANITY) {
    if (new RegExp(`\\b${w}\\b`, 'i').test(lower)) {
      return 'Your review contains inappropriate language. Please revise before submitting.';
    }
  }
  if (/https?:\/\/\S+/.test(body)) {
    return 'Links are not allowed in reviews.';
  }
  return null;
}

function StarPicker({
  value, onChange,
}: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={sp.row}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} hitSlop={8}>
          <Text style={[sp.star, n <= value && sp.starFilled]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const sp = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  star: { fontSize: 36, color: Colors.border },
  starFilled: { color: '#FFD700' },
});

const STAR_LABELS = ['', 'Terrible', 'Poor', 'OK', 'Good', 'Excellent'];

export function WriteReviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { eateryId, eateryName, existingRating, existingBody } = route.params ?? {};

  const { user } = useAuth();
  const { submitReview } = useReviews(eateryId);

  const [rating, setRating] = useState<number>(existingRating ?? 0);
  const [body, setBody] = useState<string>(existingBody ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [bodyError, setBodyError] = useState<string | null>(null);

  async function handleSubmit() {
    if (rating === 0) {
      Alert.alert('Rating required', 'Please select a star rating before submitting.');
      return;
    }
    if (body.trim()) {
      const err = filterBody(body);
      if (err) { setBodyError(err); return; }
    }
    setSubmitting(true);
    const { error } = await submitReview(user!.id, rating, body);
    setSubmitting(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      navigation.goBack();
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              {existingRating ? 'Edit Review' : 'Write a Review'}
            </Text>
            <View style={{ width: 52 }} />
          </View>

          <View style={styles.body}>
            <Text style={styles.eateryName}>{eateryName}</Text>

            {/* Star picker */}
            <View style={styles.ratingSection}>
              <StarPicker value={rating} onChange={v => setRating(v)} />
              {rating > 0 && (
                <Text style={styles.ratingLabel}>{STAR_LABELS[rating]}</Text>
              )}
            </View>

            {/* Body input */}
            <View>
              <Text style={styles.label}>
                Your review <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={[styles.input, bodyError ? styles.inputError : null]}
                placeholder="What did you think? Tell others what to expect..."
                placeholderTextColor={Colors.subtext}
                value={body}
                onChangeText={t => { setBody(t); setBodyError(null); }}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
              <View style={styles.inputMeta}>
                {bodyError ? (
                  <Text style={styles.errorText}>{bodyError}</Text>
                ) : (
                  <Text style={styles.charCount}>{body.length}/500</Text>
                )}
              </View>
            </View>

            {/* Guidelines */}
            <View style={styles.guidelines}>
              <Text style={styles.guidelinesTitle}>Community guidelines</Text>
              <Text style={styles.guidelinesText}>
                Share your honest experience. No personal attacks, links, or inappropriate language.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Submit button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitBtn, (rating === 0 || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={rating === 0 || submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color="#000" />
              : <Text style={styles.submitText}>
                  {existingRating ? 'Update Review' : 'Post Review'}
                </Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  cancel: { fontSize: 15, color: Colors.subtext },
  title: { fontSize: 16, fontWeight: '700', color: Colors.text },

  body: { padding: 20, gap: 20 },
  eateryName: { fontSize: 18, fontWeight: '800', color: Colors.text, textAlign: 'center' },

  ratingSection: { alignItems: 'center', gap: 8 },
  ratingLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },

  label: { fontSize: 13, fontWeight: '600', color: Colors.subtext, marginBottom: 8 },
  optional: { fontWeight: '400', fontStyle: 'italic' },
  input: {
    backgroundColor: Colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    color: Colors.text, fontSize: 14, lineHeight: 20,
    padding: 12, minHeight: 100,
  },
  inputError: { borderColor: '#FF3B30' },
  inputMeta: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  charCount: { fontSize: 11, color: Colors.subtext },
  errorText: { fontSize: 12, color: '#FF3B30', flex: 1 },

  guidelines: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  guidelinesTitle: { fontSize: 12, fontWeight: '700', color: Colors.subtext, marginBottom: 4 },
  guidelinesText: { fontSize: 12, color: Colors.subtext, lineHeight: 17 },

  footer: { padding: 16, paddingBottom: 8 },
  submitBtn: {
    backgroundColor: Colors.accent, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: Colors.accent, shadowOpacity: 0.3,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: '#000', fontWeight: '800', fontSize: 15 },
});
