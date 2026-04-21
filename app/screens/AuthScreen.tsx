import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '@lib/supabase';
import { Colors } from '@constants/colors';

type Mode = 'login' | 'signup';

export function AuthScreen() {
  const navigation = useNavigation<any>();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    if (mode === 'signup' && !username) {
      Alert.alert('Missing username', 'Please choose a username.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        });
        if (error) throw error;
        Alert.alert(
          '🎉 Account created!',
          'Check your email to confirm your account, then log in.',
          [{ text: 'OK', onPress: () => setMode('login') }]
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigation.goBack();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        {/* Header */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.logo}>QueueLah!</Text>
        <Text style={styles.subtitle}>
          {mode === 'login' ? 'Welcome back 👋' : 'Join the community 🍜'}
        </Text>

        {/* Form */}
        <View style={styles.form}>
          {mode === 'signup' && (
            <View style={styles.field}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. hawkerhero88"
                placeholderTextColor={Colors.subtext}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={Colors.subtext}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Min. 6 characters"
              placeholderTextColor={Colors.subtext}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#000" />
              : <Text style={styles.submitText}>
                  {mode === 'login' ? 'Log In' : 'Create Account'}
                </Text>
            }
          </TouchableOpacity>
        </View>

        {/* Toggle mode */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          </Text>
          <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            <Text style={styles.toggleLink}>
              {mode === 'login' ? 'Sign Up' : 'Log In'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Guest option */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.guestBtn}>
          <Text style={styles.guestText}>Continue without account →</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By signing up you can earn points and badges for your reports.{'\n'}
          You can always report queues anonymously without an account.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  backBtn: { marginBottom: 32 },
  backText: { color: Colors.subtext, fontSize: 15 },
  logo: {
    fontWeight: '800',
    fontSize: 36,
    color: Colors.accent,
    marginBottom: 6,
  },
  subtitle: { fontSize: 18, color: Colors.text, marginBottom: 32, fontWeight: '600' },
  form: { gap: 16, marginBottom: 24 },
  field: { gap: 6 },
  label: { fontSize: 13, color: Colors.subtext, fontWeight: '500' },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
  },
  submitBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  submitText: { color: '#000', fontWeight: '800', fontSize: 16 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  toggleText: { color: Colors.subtext, fontSize: 14 },
  toggleLink: { color: Colors.accent, fontSize: 14, fontWeight: '600' },
  guestBtn: { alignItems: 'center', marginBottom: 24 },
  guestText: { color: Colors.subtext, fontSize: 14 },
  disclaimer: {
    fontSize: 11,
    color: Colors.subtext,
    textAlign: 'center',
    lineHeight: 16,
    opacity: 0.7,
  },
});
