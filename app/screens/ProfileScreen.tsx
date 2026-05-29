import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Crown, Trophy, Settings2, Wrench, ChevronRight, X } from 'lucide-react-native';
import { useAuthStore } from '@store/authStore';
import { useAuth } from '@hooks/useAuth';
import { useProfile } from '@hooks/useProfile';
import { usePremium } from '@hooks/usePremium';
import { getRankTitle, getRankProgress, BadgeResult } from '@lib/gamification';
import { BadgeEarnedModal } from '@components/profile/BadgeEarnedModal';
import { ProBadge } from '@components/common/ProBadge';
import { PressableScale } from '@components/common/PressableScale';
import { Colors } from '@constants/colors';
import { supabase } from '@lib/supabase';
import { AvatarFrame, UsernameColor, HatKey, EyewearKey, FloatItemKey, CompanionKey } from '@types/user';
import { AvatarDisplay } from '@components/common/AvatarDisplay';
import {
  HAT_ASSETS, HAT_OPTIONS,
  EYEWEAR_ASSETS, EYEWEAR_OPTIONS,
  FLOAT_ITEM_ASSETS, FLOAT_ITEM_OPTIONS,
  COMPANION_ASSETS, COMPANION_OPTIONS,
} from '../../assets/avatar/avatarAssets';

// ─── Frame / colour config ────────────────────────────────────────────────────

const FRAMES: { value: AvatarFrame; label: string; borderColor: string; shadow?: boolean }[] = [
  { value: 'none',     label: 'None',     borderColor: 'transparent' },
  { value: 'gold',     label: 'Gold',     borderColor: '#FFD60A' },
  { value: 'glow',     label: 'Glow',     borderColor: '#FFD60A', shadow: true },
  { value: 'gradient', label: 'Gradient', borderColor: '#BF5AF2' },
];

const USERNAME_COLORS: { value: UsernameColor; label: string; color: string }[] = [
  { value: 'default', label: 'Default', color: Colors.text },
  { value: 'gold',    label: 'Gold',    color: '#FFD60A' },
  { value: 'blue',    label: 'Blue',    color: '#0A84FF' },
  { value: 'purple',  label: 'Purple',  color: '#BF5AF2' },
  { value: 'red',     label: 'Red',     color: '#FF3B30' },
];

function frameStyle(frame: AvatarFrame) {
  const f = FRAMES.find(x => x.value === frame);
  if (!f || f.value === 'none') return {};
  return {
    borderWidth: 3,
    borderColor: f.borderColor,
    ...(f.shadow ? {
      shadowColor: f.borderColor,
      shadowOpacity: 0.9,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 0 },
      elevation: 8,
    } : {}),
  };
}

function usernameColorValue(c: UsernameColor): string {
  return USERNAME_COLORS.find(x => x.value === c)?.color ?? Colors.text;
}

// ─── ProfileScreen ────────────────────────────────────────────────────────────

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, isGuest } = useAuth();
  const { setUser } = useAuthStore();
  const { stats, earnedBadgeKeys, allBadges, newBadges, clearNewBadges, loading } = useProfile(user?.id);
  const { isPro } = usePremium();

  const [celebratingBadge, setCelebratingBadge] = useState<BadgeResult | null>(null);
  const [badgeQueue, setBadgeQueue]             = useState<BadgeResult[]>([]);
  const [savingCustom, setSavingCustom]         = useState(false);

  const rankInfo = getRankProgress(user?.points ?? 0);

  useEffect(() => {
    if (newBadges.length > 0) { setBadgeQueue(newBadges); clearNewBadges(); }
  }, [newBadges]);

  useEffect(() => {
    if (badgeQueue.length > 0 && !celebratingBadge) {
      setCelebratingBadge(badgeQueue[0]);
      setBadgeQueue(prev => prev.slice(1));
    }
  }, [badgeQueue, celebratingBadge]);

  async function saveCustomisation(field: 'avatar_frame' | 'username_color' | 'avatar_hat' | 'avatar_eyewear' | 'avatar_float_item' | 'avatar_companion', value: string | null) {
    if (!user?.id) return;
    setSavingCustom(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ [field]: value })
      .eq('id', user.id)
      .select()
      .single();
    if (!error && data) setUser(data);
    setSavingCustom(false);
  }

  // ── Guest screen ──────────────────────────────────────────────
  if (isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.guestWrap}>
          <Text style={styles.guestEmoji}>👤</Text>
          <Text style={styles.guestTitle}>Join QueueLah!</Text>
          <Text style={styles.guestBody}>
            Create a free account to earn points, badges, and streaks for every queue report you submit.
          </Text>
          <View style={styles.badgePreview}>
            {['🌟','🦸','🔥','🗺️','👑'].map((icon, i) => (
              <View key={i} style={[styles.badgePreviewItem, styles.badgeLocked]}>
                <Text style={styles.badgePreviewIcon}>{icon}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.guestBadgeHint}>8 badges to unlock</Text>
          <PressableScale style={styles.joinBtn} onPress={() => navigation.navigate('Auth')}>
            <Text style={styles.joinBtnText}>Sign Up — It's Free</Text>
          </PressableScale>
          <TouchableOpacity onPress={() => navigation.navigate('Auth')}>
            <Text style={styles.loginLink}>Already have an account? Log in →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentFrame = user?.avatar_frame ?? 'none';
  const currentColor = user?.username_color ?? 'default';

  // ── Logged-in screen ──────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.avatarWrap}>
            <AvatarDisplay
              size={80}
              frame={currentFrame}
              hat={user?.avatar_hat}
              eyewear={user?.avatar_eyewear}
              floatItem={user?.avatar_float_item}
              companion={user?.avatar_companion}
            />
          </View>

          {/* Username + Pro badge */}
          <View style={styles.usernameRow}>
            <Text style={[styles.username, { color: usernameColorValue(currentColor) }]}>
              {user?.username}
            </Text>
            {isPro && <ProBadge size="md" />}
          </View>

          <Text style={styles.rankTitle}>{getRankTitle(user?.points ?? 0)}</Text>
          <View style={styles.rankBarWrap}>
            <View style={styles.rankBarBg}>
              <View style={[styles.rankBarFill, { width: `${rankInfo.progress}%` as any }]} />
            </View>
            <Text style={styles.rankBarLabel}>
              {user?.points ?? 0} pts
              {rankInfo.nextAt > 0 ? ` · ${rankInfo.nextAt - (user?.points ?? 0)} to next rank` : ' · Max rank!'}
            </Text>
          </View>
        </View>


        {/* Stats */}
        {loading ? (
          <ActivityIndicator color={Colors.accent} style={{ margin: 24 }} />
        ) : (
          <View style={styles.statsGrid}>
            {[
              { val: user?.points ?? 0,     key: 'Points' },
              { val: stats.totalReports,     key: 'Reports' },
              { val: user?.streak_days ?? 0, key: 'Streak 🔥' },
              { val: stats.uniqueEateries,   key: 'Eateries' },
              { val: stats.hawkerReports,    key: 'Hawker 🍜' },
              { val: stats.confirmedReports, key: 'Confirmed ✓' },
            ].map(({ val, key }) => (
              <View key={key} style={styles.statCard}>
                <Text style={styles.statVal}>{val}</Text>
                <Text style={styles.statKey}>{key}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Streak banner */}
        {(user?.streak_days ?? 0) > 0 && (
          <View style={styles.streakBanner}>
            <Text style={styles.streakIcon}>🔥</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.streakTitle}>{user?.streak_days}-Day Streak!</Text>
              <Text style={styles.streakSub}>Report today to keep it going</Text>
            </View>
            <TouchableOpacity style={styles.streakReportBtn} onPress={() => navigation.navigate('Map')}>
              <Text style={styles.streakReportBtnText}>Report →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Customisation — available to all users */}
        {user && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>PRO CUSTOMISATION</Text>
              {savingCustom && <ActivityIndicator size="small" color={Colors.accentYellow} />}
            </View>

            {/* ── Hats ── */}
            <Text style={styles.customLabel}>Hat</Text>
            <View style={styles.customRow}>
              <TouchableOpacity
                style={[styles.accessoryOption, !user?.avatar_hat && styles.accessoryOptionActive]}
                onPress={() => saveCustomisation('avatar_hat', null)}
              >
                <View style={styles.accessoryNone}><X size={16} color={Colors.subtext} /></View>
                <Text style={[styles.accessoryLabel, !user?.avatar_hat && { color: Colors.accentYellow }]}>None</Text>
              </TouchableOpacity>
              {HAT_OPTIONS.map(h => (
                <TouchableOpacity
                  key={h.key}
                  style={[styles.accessoryOption, user?.avatar_hat === h.key && styles.accessoryOptionActive]}
                  onPress={() => saveCustomisation('avatar_hat', h.key)}
                >
                  <Image source={HAT_ASSETS[h.key]} style={styles.accessoryThumb} resizeMode="contain" />
                  <Text style={[styles.accessoryLabel, user?.avatar_hat === h.key && { color: Colors.accentYellow }]}>
                    {h.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Eyewear ── */}
            <Text style={[styles.customLabel, { marginTop: 16 }]}>Eyewear</Text>
            <View style={styles.customRow}>
              <TouchableOpacity
                style={[styles.accessoryOption, !user?.avatar_eyewear && styles.accessoryOptionActive]}
                onPress={() => saveCustomisation('avatar_eyewear', null)}
              >
                <View style={styles.accessoryNone}><X size={16} color={Colors.subtext} /></View>
                <Text style={[styles.accessoryLabel, !user?.avatar_eyewear && { color: Colors.accentYellow }]}>None</Text>
              </TouchableOpacity>
              {EYEWEAR_OPTIONS.map(e => (
                <TouchableOpacity
                  key={e.key}
                  style={[styles.accessoryOption, user?.avatar_eyewear === e.key && styles.accessoryOptionActive]}
                  onPress={() => saveCustomisation('avatar_eyewear', e.key)}
                >
                  <Image source={EYEWEAR_ASSETS[e.key]} style={styles.accessoryThumb} resizeMode="contain" />
                  <Text style={[styles.accessoryLabel, user?.avatar_eyewear === e.key && { color: Colors.accentYellow }]}>
                    {e.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Float items ── */}
            <Text style={[styles.customLabel, { marginTop: 16 }]}>Float Item</Text>
            <View style={styles.customRow}>
              <TouchableOpacity
                style={[styles.accessoryOption, !user?.avatar_float_item && styles.accessoryOptionActive]}
                onPress={() => saveCustomisation('avatar_float_item', null)}
              >
                <View style={styles.accessoryNone}><X size={16} color={Colors.subtext} /></View>
                <Text style={[styles.accessoryLabel, !user?.avatar_float_item && { color: Colors.accentYellow }]}>None</Text>
              </TouchableOpacity>
              {FLOAT_ITEM_OPTIONS.map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.accessoryOption, user?.avatar_float_item === f.key && styles.accessoryOptionActive]}
                  onPress={() => saveCustomisation('avatar_float_item', f.key)}
                >
                  <Image source={FLOAT_ITEM_ASSETS[f.key]} style={styles.accessoryThumb} resizeMode="contain" />
                  <Text style={[styles.accessoryLabel, user?.avatar_float_item === f.key && { color: Colors.accentYellow }]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Companion ── */}
            <Text style={[styles.customLabel, { marginTop: 16 }]}>Companion</Text>
            <View style={styles.customRow}>
              <TouchableOpacity
                style={[styles.accessoryOption, !user?.avatar_companion && styles.accessoryOptionActive]}
                onPress={() => saveCustomisation('avatar_companion', null)}
              >
                <View style={styles.accessoryNone}><X size={16} color={Colors.subtext} /></View>
                <Text style={[styles.accessoryLabel, !user?.avatar_companion && { color: Colors.accentYellow }]}>None</Text>
              </TouchableOpacity>
              {COMPANION_OPTIONS.map(c => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.accessoryOption, user?.avatar_companion === c.key && styles.accessoryOptionActive]}
                  onPress={() => saveCustomisation('avatar_companion', c.key)}
                >
                  <Image source={COMPANION_ASSETS[c.key]} style={styles.accessoryThumb} resizeMode="contain" />
                  <Text style={[styles.accessoryLabel, user?.avatar_companion === c.key && { color: Colors.accentYellow }]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Avatar Frame ── */}
            <Text style={[styles.customLabel, { marginTop: 16 }]}>Avatar Frame</Text>
            <View style={styles.customRow}>
              {FRAMES.map(f => (
                <TouchableOpacity
                  key={f.value}
                  style={[
                    styles.frameOption,
                    currentFrame === f.value && styles.frameOptionActive,
                    f.value !== 'none' && { borderColor: f.borderColor },
                  ]}
                  onPress={() => saveCustomisation('avatar_frame', f.value)}
                >
                  <AvatarDisplay
                    size={44}
                    frame={f.value as AvatarFrame}
                    hat={user?.avatar_hat}
                    eyewear={user?.avatar_eyewear}
                  />
                  <Text style={[styles.frameLabel, currentFrame === f.value && { color: Colors.accentYellow }]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Username Colour ── */}
            <Text style={[styles.customLabel, { marginTop: 16 }]}>Username Colour</Text>
            <View style={styles.customRow}>
              {USERNAME_COLORS.map(c => (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.colorOption, currentColor === c.value && styles.colorOptionActive]}
                  onPress={() => saveCustomisation('username_color', c.value)}
                >
                  <View style={[styles.colorSwatch, { backgroundColor: c.color === Colors.text ? Colors.card2 : c.color }]} />
                  <Text style={[styles.colorLabel, { color: c.color }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Badges */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>BADGES</Text>
            <Text style={styles.sectionMeta}>{earnedBadgeKeys.length}/{allBadges.length} earned</Text>
          </View>
          <View style={styles.badgeGrid}>
            {allBadges.map(badge => {
              const earned = earnedBadgeKeys.includes(badge.key);
              return (
                <TouchableOpacity
                  key={badge.key}
                  style={[styles.badgeCard, earned && styles.badgeCardEarned]}
                  activeOpacity={0.8}
                  onPress={() => Alert.alert(
                    `${badge.icon} ${badge.name}`,
                    `${badge.description}\n\nRequirement: ${badge.requirement}${earned ? '\n\n✅ Earned!' : ''}`,
                  )}
                >
                  <Text style={[styles.badgeIcon, !earned && styles.badgeIconLocked]}>{badge.icon}</Text>
                  <Text style={[styles.badgeName, !earned && styles.badgeTextLocked]}>{badge.name}</Text>
                  <Text style={styles.badgeDesc}>{badge.requirement}</Text>
                  {earned && <View style={styles.earnedDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* How points work */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HOW POINTS WORK</Text>
          <View style={styles.pointsCard}>
            {[
              { action: 'Submit a report',        pts: '+10 pts' },
              { action: 'First report of the day', pts: '+20 pts bonus' },
              { action: 'Report gets confirmed',   pts: '+5 pts bonus' },
            ].map(({ action, pts }) => (
              <View key={action} style={styles.pointsRow}>
                <Text style={styles.pointsAction}>{action}</Text>
                <Text style={styles.pointsPts}>{pts}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingsRow} onPress={() => navigation.navigate('GoPro')}>
              <View style={styles.settingsLabelRow}>
                <Crown size={16} color={Colors.accentYellow} />
                <Text style={styles.settingsLabel}>QueueLah Pro — Coming Soon</Text>
              </View>
              <ChevronRight size={18} color={Colors.subtext} />
            </TouchableOpacity>
            <View style={styles.settingsDivider} />
            <TouchableOpacity style={styles.settingsRow} onPress={() => navigation.navigate('Leaderboard')}>
              <View style={styles.settingsLabelRow}>
                <Trophy size={16} color={Colors.text} />
                <Text style={styles.settingsLabel}>Leaderboard</Text>
              </View>
              <ChevronRight size={18} color={Colors.subtext} />
            </TouchableOpacity>
            <View style={styles.settingsDivider} />
            <TouchableOpacity style={styles.settingsRow} onPress={() => navigation.navigate('Settings')}>
              <View style={styles.settingsLabelRow}>
                <Settings2 size={16} color={Colors.text} />
                <Text style={styles.settingsLabel}>Settings</Text>
              </View>
              <ChevronRight size={18} color={Colors.subtext} />
            </TouchableOpacity>
            {user?.is_admin && (
              <>
                <View style={styles.settingsDivider} />
                <TouchableOpacity style={styles.settingsRow} onPress={() => navigation.navigate('Admin')}>
                  <View style={styles.settingsLabelRow}>
                    <Wrench size={16} color={Colors.text} />
                    <Text style={styles.settingsLabel}>Admin Panel</Text>
                  </View>
                  <ChevronRight size={18} color={Colors.subtext} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <BadgeEarnedModal badge={celebratingBadge} onClose={() => setCelebratingBadge(null)} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  guestWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  guestEmoji: { fontSize: 64, marginBottom: 20 },
  guestTitle: { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  guestBody: { fontSize: 15, color: Colors.subtext, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  badgePreview: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  badgePreviewItem: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  badgeLocked: { opacity: 0.4 },
  badgePreviewIcon: { fontSize: 22 },
  guestBadgeHint: { fontSize: 12, color: Colors.subtext, marginBottom: 24 },
  joinBtn: {
    backgroundColor: Colors.accent, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 32,
    width: '100%', alignItems: 'center', marginBottom: 14,
  },
  joinBtnText: { color: '#000', fontWeight: '800', fontSize: 16 },
  loginLink: { color: Colors.subtext, fontSize: 14 },

  hero: {
    alignItems: 'center', padding: 24,
    backgroundColor: Colors.card,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  streakBadge: {
    position: 'absolute', bottom: -4, right: -8,
    backgroundColor: Colors.card2, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: Colors.border,
  },
  streakBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.text },

  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  username:    { fontSize: 22, fontWeight: '800' },
  rankTitle:   { fontSize: 13, color: Colors.accent, fontWeight: '600', marginBottom: 16 },
  rankBarWrap: { width: '100%', gap: 6 },
  rankBarBg: {
    height: 6, backgroundColor: Colors.card2,
    borderRadius: 3, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
  },
  rankBarFill:  { height: '100%', borderRadius: 3, backgroundColor: Colors.accent },
  rankBarLabel: { fontSize: 11, color: Colors.subtext, textAlign: 'center' },

  proBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    margin: 16, marginBottom: 4,
    backgroundColor: 'rgba(255,214,10,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,214,10,0.25)',
    borderRadius: 14, padding: 14,
  },
  proBannerEmoji:   { fontSize: 24 },
  proBannerTitle:   { color: Colors.accentYellow, fontSize: 14, fontWeight: '700' },
  proBannerSub:     { color: Colors.subtext, fontSize: 12, marginTop: 1 },
  proBannerChevron: { color: Colors.subtext, fontSize: 20 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  statCard: {
    flex: 1, minWidth: '30%',
    backgroundColor: Colors.card, borderRadius: 14,
    padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, gap: 3,
  },
  statVal: { fontSize: 24, fontWeight: '800', color: Colors.accent },
  statKey: { fontSize: 10, color: Colors.subtext },

  streakBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 4,
    backgroundColor: 'rgba(255,214,10,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,214,10,0.25)',
    borderRadius: 14, padding: 14,
  },
  streakIcon:        { fontSize: 28 },
  streakTitle:       { fontSize: 15, fontWeight: '700', color: Colors.accentYellow },
  streakSub:         { fontSize: 12, color: Colors.subtext },
  streakReportBtn:   { backgroundColor: Colors.accentYellow, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  streakReportBtnText: { fontSize: 12, fontWeight: '800', color: '#000' },

  section:       { padding: 16, paddingBottom: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { fontSize: 11, fontWeight: '700', color: Colors.subtext, letterSpacing: 0.5 },
  sectionMeta:   { fontSize: 11, color: Colors.accent, fontWeight: '600' },

  customLabel: { color: Colors.subtext, fontSize: 12, marginBottom: 10 },
  customRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  accessoryOption: {
    alignItems: 'center', gap: 4,
    backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, padding: 8, minWidth: 64,
  },
  accessoryOptionActive: { borderColor: Colors.accentYellow },
  accessoryThumb: { width: 48, height: 48 },
  accessoryNone: {
    width: 48, height: 48, borderRadius: 8,
    backgroundColor: Colors.card2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  accessoryLabel: { color: Colors.subtext, fontSize: 10, textAlign: 'center' },

  frameOption: {
    alignItems: 'center', gap: 6,
    backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, padding: 10,
  },
  frameOptionActive: { borderColor: Colors.accentYellow },
  frameLabel: { color: Colors.subtext, fontSize: 11 },

  colorOption: {
    alignItems: 'center', gap: 5,
    backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
  },
  colorOptionActive: { borderColor: Colors.accentYellow },
  colorSwatch:       { width: 20, height: 20, borderRadius: 10 },
  colorLabel:        { fontSize: 11, fontWeight: '600' },

  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeCard: {
    width: '30.5%', backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 14, padding: 12, alignItems: 'center', gap: 4,
    position: 'relative',
  },
  badgeCardEarned:  { borderColor: Colors.accentYellow, backgroundColor: 'rgba(255,214,10,0.05)' },
  badgeIcon:        { fontSize: 28 },
  badgeIconLocked:  { opacity: 0.25 },
  badgeName:        { fontSize: 11, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  badgeTextLocked:  { color: Colors.subtext, opacity: 0.5 },
  badgeDesc:        { fontSize: 9, color: Colors.subtext, textAlign: 'center' },
  earnedDot: {
    position: 'absolute', top: 8, right: 8,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: Colors.accentYellow,
  },

  pointsCard: {
    backgroundColor: Colors.card,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  pointsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  pointsAction: { fontSize: 13, color: Colors.text },
  pointsPts:    { fontSize: 13, fontWeight: '700', color: Colors.accent },

  settingsCard: {
    backgroundColor: Colors.card,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  settingsRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  settingsDivider:  { height: 1, backgroundColor: Colors.border },
  settingsLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingsLabel:    { fontSize: 14, color: Colors.text },
});
