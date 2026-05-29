import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import {
  AvatarFrame, HatKey, EyewearKey, FloatItemKey, CompanionKey,
} from '@types/user';
import {
  BASE_CHARACTER,
  HAT_ASSETS, EYEWEAR_ASSETS, FLOAT_ITEM_ASSETS, COMPANION_ASSETS,
} from '../../../assets/avatar/avatarAssets';

interface Props {
  size: number;
  frame?: AvatarFrame;
  hat?: HatKey | null;
  eyewear?: EyewearKey | null;
  floatItem?: FloatItemKey | null;
  companion?: CompanionKey | null;
}

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

export function AvatarDisplay({
  size, frame, hat, eyewear, floatItem, companion,
}: Props) {
  const s = size;

  // Wrapper: 2.1s wide, 1.4s tall.
  // Ring, hat, and eyewear all use alignSelf:'center' so they stay centred
  // together. Companion and float item are anchored left:0 / right:0.
  return (
    <View style={{ width: s * 2.1, height: s * 1.4, alignItems: 'center', justifyContent: 'flex-end' }}>

      {/* ── Companion — bottom-left, clear of avatar frame ── */}
      {companion && COMPANION_ASSETS[companion] && (
        <Image
          source={COMPANION_ASSETS[companion]}
          style={[styles.abs, {
            width:  s * 0.48,
            height: s * 0.48,
            left:   0,
            bottom: s * 0.08,
          }]}
          resizeMode="contain"
        />
      )}

      {/* ── Float item — bottom-right, clear of avatar frame ── */}
      {floatItem && FLOAT_ITEM_ASSETS[floatItem] && (
        <Image
          source={FLOAT_ITEM_ASSETS[floatItem]}
          style={[styles.abs, {
            width:  s * 0.48,
            height: s * 0.48,
            right:  0,
            bottom: s * 0.08,
          }]}
          resizeMode="contain"
        />
      )}

      {/* ── Base character + frame ring ──
          marginTop: s*0.045 shifts the image down so the blob's eyes
          (canvas row 570/1254 = 45.5%) sit at the ring's visual midpoint. */}
      <View style={[{
        width:        s,
        height:       s,
        borderRadius: s / 2,
        alignSelf:    'center',
      }, frameStyle(frame)]}>
        <Image
          source={BASE_CHARACTER}
          style={{ width: s, height: s, marginTop: s * 0.045, marginLeft: -s * 0.03 }}
          resizeMode="contain"
        />
      </View>

      {/* ── Hat — overflows above the ring ── */}
      {hat && HAT_ASSETS[hat] && (
        <Image
          source={HAT_ASSETS[hat]}
          style={[styles.abs, {
            width:     s * 0.78,
            height:    s * 0.5,
            bottom:    s * 0.80,
            alignSelf: 'center',
          }]}
          resizeMode="contain"
        />
      )}

      {/* ── Eyewear ──
          Container 0.50s × 0.28s centred on the blob's eye oval.
          bottom: s*0.32 tuned visually to sit on the eyes. */}
      {eyewear && EYEWEAR_ASSETS[eyewear] && (
        <Image
          source={EYEWEAR_ASSETS[eyewear]}
          style={[styles.abs, {
            width:     s * 0.50,
            height:    s * 0.28,
            bottom:    s * 0.32,
            alignSelf: 'center',
          }]}
          resizeMode="contain"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
});
