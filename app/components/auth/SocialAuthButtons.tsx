/**
 * Reusable social sign-in button row. Renders ONLY the providers enabled in
 * providers.ts. Apple is first on iOS (App Store Guideline 4.8). If no provider
 * is enabled (the live default), this renders nothing — a safe no-op, so adding
 * it to a screen never affects the live build until credentials are configured.
 *
 * Design notes (per Emil Kowalski's UI-polish principles, adapted to RN):
 *  - Press feedback: each button dims to activeOpacity 0.8 on press so it feels
 *    like the UI is listening — the RN equivalent of a subtle scale-on-press.
 *  - Only the button that is loading dims/locks; the others simply disable
 *    (no global wash) so state is legible.
 *  - Brand-accurate fills: Apple black, Google white-with-border, Facebook blue.
 *  - Accessible: every button has a role + label + busy/disabled state.
 *  - Consistent geometry with the email form's submit button (radius 14).
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { Colors } from '@constants/colors';
import { useSocialAuth } from '@lib/auth/useSocialAuth';
import { orderedProviders, type SocialProvider } from '@lib/auth/providers';
import type { SocialAuthResult } from '@lib/auth/socialAuth';

const LABEL: Record<SocialProvider, string> = {
  apple: 'Continue with Apple',
  google: 'Continue with Google',
  facebook: 'Continue with Facebook',
};

// Apple ' ' is the SF-Symbols Apple glyph (renders on iOS). Google/Facebook use
// a brand-colored monogram tile so we don't ship image assets in the module.
const ICON: Record<SocialProvider, string> = {
  apple: '',
  google: 'G',
  facebook: 'f',
};

const THEME: Record<
  SocialProvider,
  { bg: string; fg: string; border?: string; iconColor?: string }
> = {
  apple: { bg: '#000000', fg: '#FFFFFF' },
  google: { bg: '#FFFFFF', fg: '#1F1F1F', border: '#DADCE0', iconColor: '#4285F4' },
  facebook: { bg: '#1877F2', fg: '#FFFFFF' },
};

export function SocialAuthButtons({
  onSuccess,
}: {
  onSuccess?: (result: SocialAuthResult) => void;
}) {
  const providers = orderedProviders();
  const { authenticate, loadingProvider } = useSocialAuth(onSuccess);

  if (providers.length === 0) return null; // nothing enabled yet — safe no-op

  const anyLoading = loadingProvider !== null;

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.line} />
      </View>

      {providers.map((p: SocialProvider) => {
        const theme = THEME[p];
        const busy = loadingProvider === p;
        const disabled = anyLoading; // lock the row while any flow is in flight
        return (
          <TouchableOpacity
            key={p}
            style={[
              styles.btn,
              { backgroundColor: theme.bg },
              theme.border ? { borderColor: theme.border, borderWidth: 1 } : null,
              busy && styles.btnBusy,
            ]}
            onPress={() => authenticate(p)}
            disabled={disabled}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={LABEL[p]}
            accessibilityState={{ disabled, busy }}
          >
            {busy ? (
              <ActivityIndicator color={theme.fg} />
            ) : (
              <>
                <Text
                  style={[
                    styles.icon,
                    p === 'apple' && styles.appleIcon,
                    { color: theme.iconColor ?? theme.fg },
                  ]}
                  allowFontScaling={false}
                >
                  {ICON[p]}
                </Text>
                <Text style={[styles.label, { color: theme.fg }]}>{LABEL[p]}</Text>
              </>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginTop: 4, marginBottom: 8 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  dividerText: {
    color: Colors.subtext,
    fontSize: 12,
    fontWeight: '500',
    marginHorizontal: 12,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 16,
  },
  btnBusy: { opacity: 0.9 },
  icon: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 10,
    width: 20,
    textAlign: 'center',
  },
  appleIcon: {
    fontSize: 20,
    // Apple glyph sits slightly high; nudge it onto the text baseline.
    marginTop: Platform.OS === 'ios' ? -2 : 0,
  },
  label: { fontSize: 16, fontWeight: '600', letterSpacing: 0.1 },
});
