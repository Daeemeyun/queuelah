import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Platform,
} from 'react-native';
import MapView, { Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useEateries } from '@hooks/useEateries';
import { useLocation } from '@hooks/useLocation';
import { useAllQueueStatuses } from '@hooks/useAllQueueStatuses';
import { useAuth } from '@hooks/useAuth';
import { MapMarker } from '@components/map/MapMarker';
import { EateryBottomSheet } from '@components/map/EateryBottomSheet';
import { Colors } from '@constants/colors';
import { Config } from '@constants/config';
import { Eatery } from '@types/eatery';

export function MapScreen() {
  const navigation = useNavigation<any>();
  const mapRef = useRef<MapView>(null);

  const { eateries, loading } = useEateries();
  const location = useLocation();
  const statuses = useAllQueueStatuses();
  const { isGuest } = useAuth();

  const [selectedEatery, setSelectedEatery] = useState<Eatery | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Filter eateries by search query
  const filteredEateries = searchQuery.trim()
    ? eateries.filter(e =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : eateries;

  // Navigate to eatery on search result tap
  function flyToEatery(eatery: Eatery) {
    mapRef.current?.animateToRegion({
      latitude: eatery.latitude,
      longitude: eatery.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 600);
    setSearchQuery('');
    setSearchFocused(false);
    setSelectedEatery(eatery);
  }

  // Centre map on user location
  function centreOnUser() {
    if (!location.granted) return;
    mapRef.current?.animateToRegion({
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 600);
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: Config.MAP_DEFAULT_LAT,
          longitude: Config.MAP_DEFAULT_LNG,
          latitudeDelta: Config.MAP_DEFAULT_DELTA,
          longitudeDelta: Config.MAP_DEFAULT_DELTA,
        }}
        showsUserLocation={location.granted}
        showsMyLocationButton={false}
        customMapStyle={darkMapStyle}
      >
        {filteredEateries.map(eatery => (
          <MapMarker
            key={eatery.id}
            eatery={eatery}
            status={statuses[eatery.id]}
            onPress={() => setSelectedEatery(eatery)}
          />
        ))}
      </MapView>

      {/* Search bar */}
      <SafeAreaView style={styles.topOverlay} edges={['top']}>
        <View style={styles.searchWrap}>
          <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search hawker centres, cafes..."
              placeholderTextColor={Colors.subtext}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search results dropdown */}
          {searchFocused && searchQuery.length > 0 && (
            <View style={styles.searchResults}>
              {filteredEateries.length === 0 ? (
                <Text style={styles.noResults}>No eateries found</Text>
              ) : (
                filteredEateries.slice(0, 5).map(eatery => (
                  <TouchableOpacity
                    key={eatery.id}
                    style={styles.searchResultRow}
                    onPress={() => flyToEatery(eatery)}
                  >
                    <Text style={styles.searchResultName}>{eatery.name}</Text>
                    <Text style={styles.searchResultType}>
                      {eatery.type.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingBadge}>
          <ActivityIndicator size="small" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading eateries...</Text>
        </View>
      )}

      {/* Map legend */}
      <View style={styles.legend}>
        {[
          { color: Colors.queueShort,  label: 'Short' },
          { color: Colors.queueMedium, label: 'Medium' },
          { color: Colors.queueLong,   label: 'Long' },
          { color: Colors.queueNoData, label: 'No data' },
        ].map(({ color, label }) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Location button */}
      {location.granted && (
        <TouchableOpacity style={styles.locationBtn} onPress={centreOnUser}>
          <Text style={styles.locationBtnText}>📍</Text>
        </TouchableOpacity>
      )}

      {/* Report FAB */}
      <View style={styles.fabWrap}>
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => {
            if (selectedEatery) {
              navigation.navigate('ReportQueue', {
                eateryId: selectedEatery.id,
                eateryName: selectedEatery.name,
              });
            } else {
              navigation.navigate('ReportQueue', {
                eateryId: '',
                eateryName: '',
              });
            }
          }}
        >
          <Text style={styles.fabText}>＋ Report a Queue</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom sheet for selected eatery */}
      <EateryBottomSheet
        eatery={selectedEatery}
        status={selectedEatery ? statuses[selectedEatery.id] : undefined}
        onClose={() => setSelectedEatery(null)}
        onReport={() => {
          setSelectedEatery(null);
          navigation.navigate('ReportQueue', {
            eateryId: selectedEatery!.id,
            eateryName: selectedEatery!.name,
          });
        }}
        onViewDetail={() => {
          setSelectedEatery(null);
          navigation.navigate('EateryDetail', {
            eateryId: selectedEatery!.id,
          });
        }}
      />
    </View>
  );
}

// Dark map style matching the app theme
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8E8E93' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a3e' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#333350' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a3a55' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a2e1a' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },

  // Search
  topOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    zIndex: 10,
  },
  searchWrap: { margin: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(22,22,30,0.97)',
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  searchBarFocused: { borderColor: Colors.accent },
  searchIcon: { fontSize: 15 },
  searchInput: {
    flex: 1, color: Colors.text,
    fontSize: 14,
  },
  clearBtn: { color: Colors.subtext, fontSize: 14, padding: 2 },
  searchResults: {
    backgroundColor: 'rgba(22,22,30,0.98)',
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 14, marginTop: 6, overflow: 'hidden',
  },
  searchResultRow: {
    padding: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  searchResultName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  searchResultType: { fontSize: 11, color: Colors.subtext, marginTop: 2, textTransform: 'capitalize' },
  noResults: { padding: 14, color: Colors.subtext, fontSize: 13 },

  // Loading
  loadingBadge: {
    position: 'absolute', top: 100, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(22,22,30,0.95)',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
  },
  loadingText: { fontSize: 12, color: Colors.subtext },

  // Legend
  legend: {
    position: 'absolute', bottom: 100, left: 12,
    backgroundColor: 'rgba(22,22,30,0.95)',
    borderRadius: 12, padding: 10, gap: 5,
    borderWidth: 1, borderColor: Colors.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 10, color: Colors.subtext },

  // Location button
  locationBtn: {
    position: 'absolute', bottom: 100, right: 12,
    backgroundColor: 'rgba(22,22,30,0.95)',
    borderRadius: 12, width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  locationBtnText: { fontSize: 20 },

  // FAB
  fabWrap: {
    position: 'absolute', bottom: 24, left: 12, right: 12,
  },
  fab: {
    backgroundColor: Colors.accent,
    borderRadius: 16, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOpacity: 0.4, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  fabText: { color: '#000', fontWeight: '800', fontSize: 15 },
});
