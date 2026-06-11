import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { AvatarFrame, HatKey, FloatItemKey, CompanionKey, UsernameColor } from '@types/user';
import { Colors } from '@constants/colors';
import {
  HAT_ASSETS, FLOAT_ITEM_ASSETS, COMPANION_ASSETS,
} from '../../../assets/avatar/avatarAssets';

interface Props {
  size: number;
  /** Uploaded photo URL. When set, the centre is the photo; otherwise an initial placeholder. */
  avatarUrl?: string | null;
  /** Used for the placeholder initial + colour when no photo is set. */
  username?: string | null;
  usernameColor?: UsernameColor;
  frame?: AvatarFrame;
  hat?: HatKey | null;
  floatItem?: FloatItemKey | null;
  companion?: CompanionKey | null;
  /**
   * NOTE: eyewear is intentionally dropped in photo mode — on an arbitrary real
   * photo the eyes are never where the old blob's painted eyes were, so glasses
   * would float in the wrong place. Hat / companion / float are position-agnostic.
   */
}

const PLACEHOLDER_COLORS: Record<UsernameColor, string> = {
  default: Colors.card2,
  gold:    '#FFD60A',
  blue:    '#0A84FF',
  purple:  '#BF5AF2',
  red:     '#FF3B30',
};

function frameStyle(frame?: AvatarFrame) {
  if (!frame || frame === 'none') return {};
  const colors: Record<string, string> = {
    gold:     '#FFD60A',
    glow:     '#FFD60A',
    gradient: '#BF5AF2',
  };
  const color = colors[frame] ?? 'transparent';
  return {
    borderWidth: 3,
    borderColor: color,
    ...(frame === 'glow' ? {
      shadowColor: color,
      shadowOpacity: 0.9,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 0 },
      elevation: 8,
    } : {}),
  };
}

export function UserAvatar({
  size, avatarUrl, username, usernameColor = 'default',
  frame, hat, floatItem, companion,
}: Props) {
  const s = size;
  const initial = (username?.trim()?.[0] ?? '?').toUpperCase();
  const placeholderBg = PLACEHOLDER_COLORS[usernameColor] ?? Colors.card2;
  // Light bg ('default') → light text; coloured bg → dark text for contrast.
  const initialColor = usernameColor === 'default' ? Colors.text : '#1C1C28';

  return (
    <View style={{ width: s * 2.1, height: s * 1.4, alignItems: 'center', justifyContent: 'flex-end' }}>

      {/* ── Companion — bottom-left ── */}
      {companion && COMPANION_ASSETS[companion] && (
        <Image
          source={COMPANION_ASSETS[companion]}
          style={[styles.abs, { width: s * 0.48, height: s * 0.48, left: 0, bottom: s * 0.08 }]}
          resizeMode="contain"
        />
      )}

      {/* ── Float item — bottom-right ── */}
      {floatItem && FLOAT_ITEM_ASSETS[floatItem] && (
        <Image
          source={FLOAT_ITEM_ASSETS[floatItem]}
          style={[styles.abs, { width: s * 0.48, height: s * 0.48, right: 0, bottom: s * 0.08 }]}
          resizeMode="contain"
        />
      )}

      {/* ── Centre: photo or initial placeholder + frame ring ── */}
      <View style={[{
        width: s, height: s, borderRadius: s / 2,
        alignSelf: 'center', overflow: 'hidden',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: avatarUrl ? Colors.card2 : placeholderBg,
      }, frameStyle(frame)]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={{ width: s, height: s }} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: s * 0.42, fontWeight: '800', color: initialColor }}>
            {initial}
          </Text>
        )}
      </View>

      {/* ── Hat — overflows above the ring ── */}
      {hat && HAT_ASSETS[hat] && (
        <Image
          source={HAT_ASSETS[hat]}
          style={[styles.abs, { width: s * 0.78, height: s * 0.5, bottom: s * 0.80, alignSelf: 'center' }]}
          resizeMode="contain"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
});
