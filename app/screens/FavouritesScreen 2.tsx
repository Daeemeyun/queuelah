import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@constants/colors';

export function FavouritesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.emoji}>⭐</Text>
        <Text style={styles.title}>Saved Eateries</Text>
        <Text style={styles.sub}>Coming in Phase 6!</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emoji: { fontSize: 48 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text },
  sub: { fontSize: 14, color: Colors.subtext },
});
