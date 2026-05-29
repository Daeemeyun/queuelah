/**
 * PressableScale
 *
 * Drop-in replacement for TouchableOpacity on primary actions.
 * Applies a subtle scale-down on press so the interface feels like
 * it is truly listening — Emil Kowalski: "buttons must feel responsive."
 *
 * Scale 0.97 is intentionally subtle; the user's finger is already
 * confirming the press physically, so this is reinforcement, not drama.
 */

import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  Animated,
} from 'react-native';

interface Props extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  scale?: number; // default 0.97
}

export function PressableScale({ style, children, scale = 0.97, ...rest }: Props) {
  const anim = React.useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(anim, {
      toValue: scale,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  }

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale: anim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
