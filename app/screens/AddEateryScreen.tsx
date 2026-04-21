import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { supabase } from '@lib/supabase';
import { useAuth } from '@hooks/useAuth';
import { Colors } from '@constants/colors';

type EateryType = 'hawker_centre' | 'restaurant' | 'cafe' | 'food_court';

const TYPE_OPTIONS: { value: EateryType; label: string; emoji: string }[] = [
  { value: 'hawker_centre', label: 'Hawker Centre', emoji: '🍜' },
  { value: 'restaurant',    label: 'Restaurant',    emoji: '🍽️' },
  { value: 'cafe',          label: 'Café',          emoji: '☕' },
  { value: 'food_court',    label: 'Food Court',    emoji: '🏢' },
];

interface GeoResult {
  display_name: string;
  lat: string;
  lon: string;
}

async function geocodeAddress(query: string): Promise<GeoResult | null> {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(query + ', Singapore')}` +
    `&format=json&countrycodes=sg&limit=1`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'QueueLah/1.0' },
  });
  if (!res.ok) return null;
  const data: GeoResult[] = await res.json();
  return data[0] ?? null;
}

export function AddEateryScreen() {
  const navigation = useNavigation<any>();
  const { user, isGuest } = useAuth();

  const [name, setName]           = useState('');
  const [type, setType]           = useState<EateryType>('hawker_centre');
  const [address, setAddress]     = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [geocoded, setGeocoded]   = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleLookupAddress() {
    const trimmed = address.trim();
    if (!trimmed) return;
    setGeocoding(true);
    setGeocoded(null);
    try {
      const result = await geocodeAddress(trimmed);
      if (!result) {
        Alert.alert('Address not found', 'Try a more specific address or postal code.');
        return;
      }
      setGeocoded({
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        label: result.display_name,
      });
    } catch {
      Alert.alert('Error', 'Could not look up address. Check your connection.');
    } finally {
      setGeocoding(false);
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter the name of the place.');
      return;
    }
    if (!geocoded) {
      Alert.alert('No location', 'Please look up the address first.');
      return;
    }
    if (isGuest || !user) {
      Alert.alert('Sign in required', 'You need an account to add new places.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('eateries').insert({
        name: name.trim(),
        type,
        address: address.trim(),
        latitude: geocoded.lat,
        longitude: geocoded.lng,
        opening_hours: '',
        has_stalls: type === 'hawker_centre',
        source: 'user_submitted',
        submitted_by: user.id,
        verified: false,
        is_featured: false,
      });

      if (error) throw error;

      Alert.alert(
        'Place added!',
        `${name.trim()} has been submitted and will appear on the map shortly.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add a Place</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.subtitle}>
            Know a hawker centre or restaurant that's missing? Add it here.
          </Text>

          {/* Name */}
          <Text style={styles.label}>Place Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Tiong Bahru Market"
            placeholderTextColor={Colors.subtext}
            value={name}
            onChangeText={setName}
            returnKeyType="next"
          />

          {/* Type */}
          <Text style={styles.label}>Type</Text>
          <View style={styles.typeRow}>
            {TYPE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.typeChip, type === opt.value && styles.typeChipActive]}
                onPress={() => setType(opt.value)}
              >
                <Text style={styles.typeEmoji}>{opt.emoji}</Text>
                <Text style={[styles.typeLabel, type === opt.value && styles.typeLabelActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Address */}
          <Text style={styles.label}>Address or Postal Code</Text>
          <View style={styles.addressRow}>
            <TextInput
              style={[styles.input, styles.addressInput]}
              placeholder="e.g. 30 Seng Poh Rd, 168898"
              placeholderTextColor={Colors.subtext}
              value={address}
              onChangeText={text => {
                setAddress(text);
                setGeocoded(null);
              }}
              returnKeyType="search"
              onSubmitEditing={handleLookupAddress}
            />
            <TouchableOpacity
              style={[styles.lookupBtn, geocoding && styles.lookupBtnDisabled]}
              onPress={handleLookupAddress}
              disabled={geocoding || !address.trim()}
            >
              {geocoding ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.lookupBtnText}>Look up</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Geocoding result */}
          {geocoded && (
            <View style={styles.geocodedCard}>
              <Text style={styles.geocodedIcon}>📍</Text>
              <Text style={styles.geocodedText} numberOfLines={2}>
                {geocoded.label}
              </Text>
            </View>
          )}

          {/* Guest warning */}
          {isGuest && (
            <View style={styles.warnCard}>
              <Text style={styles.warnText}>
                You need to sign in to add new places.
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Auth')}>
                <Text style={styles.warnLink}>Sign in →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!name.trim() || !geocoded || submitting || isGuest) && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!name.trim() || !geocoded || submitting || isGuest}
          >
            {submitting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.submitText}>Submit Place</Text>
            )}
          </TouchableOpacity>
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
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { color: Colors.subtext, fontSize: 18 },
  title: { color: Colors.text, fontSize: 17, fontWeight: '700' },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 6, paddingBottom: 40 },

  subtitle: {
    color: Colors.subtext, fontSize: 13, marginBottom: 16, lineHeight: 18,
  },

  label: {
    color: Colors.subtext, fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 16, marginBottom: 6,
  },

  input: {
    backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    color: Colors.text, fontSize: 15,
  },

  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
  },
  typeChipActive: { borderColor: Colors.accent, backgroundColor: 'rgba(255,107,53,0.1)' },
  typeEmoji: { fontSize: 14 },
  typeLabel: { color: Colors.subtext, fontSize: 13, fontWeight: '500' },
  typeLabelActive: { color: Colors.accent },

  addressRow: { flexDirection: 'row', gap: 8 },
  addressInput: { flex: 1 },
  lookupBtn: {
    backgroundColor: Colors.accent, borderRadius: 12,
    paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center',
    minWidth: 72,
  },
  lookupBtnDisabled: { opacity: 0.5 },
  lookupBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },

  geocodedCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(52,199,89,0.08)',
    borderWidth: 1, borderColor: 'rgba(52,199,89,0.25)',
    borderRadius: 10, padding: 12, marginTop: 6,
  },
  geocodedIcon: { fontSize: 14, marginTop: 1 },
  geocodedText: { flex: 1, color: Colors.queueShort, fontSize: 13, lineHeight: 18 },

  warnCard: {
    backgroundColor: 'rgba(255,107,53,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,107,53,0.2)',
    borderRadius: 10, padding: 14, marginTop: 8, gap: 6,
  },
  warnText: { color: Colors.subtext, fontSize: 13 },
  warnLink: { color: Colors.accent, fontSize: 13, fontWeight: '600' },

  submitBtn: {
    backgroundColor: Colors.accent, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: '#000', fontWeight: '800', fontSize: 15 },
});
