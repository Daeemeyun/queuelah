import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { supabase } from '@lib/supabase';
import { useAuth } from '@hooks/useAuth';
import { checkContent } from '@lib/contentFilter';
import { Colors } from '@constants/colors';
import { CATEGORIES, ForumCategory } from '@screens/ForumScreen';

const CATEGORY_OPTIONS = Object.entries(CATEGORIES) as [ForumCategory, typeof CATEGORIES[ForumCategory]][];

export function NewForumPostScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [category, setCategory]   = useState<ForumCategory>('general_feedback');
  const [title, setTitle]         = useState('');
  const [body, setBody]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);

  // Live filter check as user types
  function handleTitleChange(text: string) {
    setTitle(text);
    if (filterError) setFilterError(null);
  }

  function handleBodyChange(text: string) {
    setBody(text);
    if (filterError) setFilterError(null);
  }

  async function handleSubmit() {
    if (!user?.id) return;

    // Pre-post content filter
    const result = checkContent(title, body);
    if (!result.clean) {
      setFilterError(result.reason ?? 'Post contains disallowed content.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('forum_posts').insert({
        user_id:  user.id,
        category,
        title:    title.trim(),
        body:     body.trim(),
        upvotes:  0,
      });

      if (error) throw error;

      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not submit post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = title.trim().length >= 5 && body.trim().length >= 10 && !submitting;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Post</Text>
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting
              ? <ActivityIndicator size="small" color="#000" />
              : <Text style={styles.submitBtnText}>Post</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Category */}
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORY_OPTIONS.map(([value, meta]) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.catChip,
                  category === value && { borderColor: meta.color, backgroundColor: meta.color + '18' },
                ]}
                onPress={() => setCategory(value)}
              >
                <Text style={styles.catEmoji}>{meta.emoji}</Text>
                <Text style={[styles.catLabel, category === value && { color: meta.color }]}>
                  {meta.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Title */}
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Summarise your post in one line..."
            placeholderTextColor={Colors.subtext}
            value={title}
            onChangeText={handleTitleChange}
            maxLength={120}
            returnKeyType="next"
          />
          <Text style={styles.charCount}>{title.length}/120</Text>

          {/* Body */}
          <Text style={styles.label}>Details</Text>
          <TextInput
            style={[styles.input, styles.bodyInput]}
            placeholder="Share more details, steps to reproduce, or your idea..."
            placeholderTextColor={Colors.subtext}
            value={body}
            onChangeText={handleBodyChange}
            maxLength={1000}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{body.length}/1000</Text>

          {/* Filter error */}
          {filterError && (
            <View style={styles.errorCard}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{filterError}</Text>
            </View>
          )}

          {/* Guidelines */}
          <View style={styles.guidelinesCard}>
            <Text style={styles.guidelinesTitle}>Community Guidelines</Text>
            <Text style={styles.guidelinesText}>
              • Be respectful and constructive{'\n'}
              • No profanity or offensive language{'\n'}
              • No links or external references{'\n'}
              • Posts are moderated and may be removed
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  closeBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeText:    { color: Colors.subtext, fontSize: 18 },
  headerTitle:  { color: Colors.text, fontSize: 17, fontWeight: '700' },
  submitBtn: {
    backgroundColor: Colors.accent, borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 8,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 6, paddingBottom: 40 },

  label: {
    color: Colors.subtext, fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 16, marginBottom: 8,
  },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
  },
  catEmoji: { fontSize: 14 },
  catLabel: { color: Colors.subtext, fontSize: 13, fontWeight: '500' },

  input: {
    backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    color: Colors.text, fontSize: 15,
  },
  bodyInput: { minHeight: 140 },
  charCount: { color: Colors.subtext, fontSize: 11, textAlign: 'right', marginTop: 4 },

  errorCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(255,59,48,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.25)',
    borderRadius: 10, padding: 12, marginTop: 8,
  },
  errorIcon: { fontSize: 14 },
  errorText: { flex: 1, color: '#FF3B30', fontSize: 13, lineHeight: 18 },

  guidelinesCard: {
    backgroundColor: Colors.card2,
    borderRadius: 12, padding: 14, marginTop: 16, gap: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  guidelinesTitle: { color: Colors.subtext, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  guidelinesText:  { color: Colors.subtext, fontSize: 12, lineHeight: 19 },
});
