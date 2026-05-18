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

// Frame styles — matches the existing ProfileScreen frame logic
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
  const s = size; // shorthand

  return (
    // Outer wrapper is oversized to give accessories room to overflow
    <View style={{ width: s * 1.8, height: s * 1.4, alignItems: 'center', justifyContent: 'flex-end' }}>

      {/* Float item — sits to the right of the character */}
      {floatItem && FLOAT_ITEM_ASSETS[floatItem] && (
        <Image
          source={FLOAT_ITEM_ASSETS[floatItem]}
          style={[styles.layer, {
            width: s * 0.48,
            height: s * 0.48,
            position: 'absolute',
            right: 0,
            bottom: s * 0.1,
          }]}
          resizeMode="contain"
        />
      )}

      {/* Companion — sits to the top-right of the character */}
      {companion && COMPANION_ASSETS[companion] && (
        <Image
          source={COMPANION_ASSETS[companion]}
          style={[styles.layer, {
            width: s * 0.38,
            height: s * 0.38,
            position: 'absolute',
            right: s * 0.08,
            bottom: s * 0.72,
          }]}
          resizeMode="contain"
        />
      )}

      {/* Base character + frame */}
      {/* Outer view carries the border/shadow; inner view clips image to circle */}
      <View style={[{
        width: s,
        height: s,
        borderRadius: s / 2,
        alignSelf: 'center',
      }, frameStyle(frame)]}>
        <View style={{
          width: '100%', height: '100%',
          borderRadius: s / 2,
          overflow: 'hidden',
        }}>
          <Image
            source={BASE_CHARACTER}
            style={{ width: s, height: s }}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Hat — sits above the character */}
      {hat && HAT_ASSETS[hat] && (
        <Image
          source={HAT_ASSETS[hat]}
          style={[styles.layer, {
            width: s * 0.78,
            height: s * 0.5,
            position: 'absolute',
            bottom: s * 0.78,
            alignSelf: 'center',
          }]}
          resizeMode="contain"
        />
      )}

      {/* Eyewear — sits across the eye area */}
      {eyewear && EYEWEAR_ASSETS[eyewear] && (
        <Image
          source={EYEWEAR_ASSETS[eyewear]}
          style={[styles.layer, {
            width: s * 0.82,
            height: s * 0.3,
            position: 'absolute',
            bottom: s * 0.44,
            alignSelf: 'center',
          }]}
          resizeMode="contain"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute' },
});
