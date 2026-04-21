import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Colors } from '@constants/colors';

export function LoadingSpinner() {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size={36} color={Colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
});
