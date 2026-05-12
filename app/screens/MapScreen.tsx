import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, ScrollView,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Supercluster from 'supercluster';

import { useEateries } from '@hooks/useEateries';
import { useLocation } from '@hooks/useLocation';
import { useAllQueueStatuses } from '@hooks/useAllQueueStatuses';
import { MapMarker } from '@components/map/MapMarker';
import { EateryBottomSheet } from '@components/map/EateryBottomSheet';
import { StatusDot } from '@components/common/StatusDot';
import { queueLevelLabel, getQueueColor } from '@lib/helpers';
import { Colors } from '@constants/colors';
import { Config } from '@constants/config';
import { Eatery } from '@types/eatery';

const CLUSTER_RADIUS = 50;
const CLUSTER_MAX_ZOOM = 15;

const INITIAL_REGION: Region = {
  latitude: Config.MAP_DEFAULT_LAT,
  longitude: Config.MAP_DEFAULT_LNG,
  latitudeDelta: Config.MAP_DEFAULT_DELTA,
  longitudeDelta: Config.MAP_DEFAULT_DELTA,
};

function regionToZoom(r: Region): number {
  return Math.round(Math.log(360 / r.longitudeDelta) / Math.LN2);
}

export function MapScreen() {
  const navigation = useNavigation<any>();
  const mapRef = useRef<MapView>(null);

  const { eateries, loading } = useEateries();
  const location = useLocation();
  const statuses = useAllQueueStatuses();

  const [selectedEatery, setSelectedEatery] = useState<Eatery | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [region, setRegion] = useState<Region>(INITIAL_REGION);

  // Fast lookup by id
  const eateriesById = useMemo(
    () => Object.fromEntries(eateries.map(e => [e.id, e])),
    [eateries],
  );

  // Search-filtered eateries (used when search is active)
  const filteredEateries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return eateries;
    return eateries.filter(
      e =>
        e.name.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q),
    );
  }, [eateries, searchQuery]);

  // Supercluster index — rebuilt only when eatery list changes
  const supercluster = useMemo(() => {
    const sc = new Supercluster<{ id: string }>({
      radius: CLUSTER_RADIUS,
      maxZoom: CLUSTER_MAX_ZOOM,
    });
    sc.load(
      eateries.map(e => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [e.longitude, e.latitude] },
        properties: { id: e.id },
      })),
    );
    return sc;
  }, [eateries]);

  // Visible clusters for the current viewport
  const clusters = useMemo(() => {
    const zoom = regionToZoom(region);
    const bounds: [number, number, number, number] = [
      region.longitude - region.longitudeDelta / 2,
      region.latitude - region.latitudeDelta / 2,
      region.longitude + region.longitudeDelta / 2,
      region.latitude + region.latitudeDelta / 2,
    ];
    return supercluster.getClusters(bounds, zoom);
  }, [supercluster, region]);

  function flyToEatery(eatery: Eatery) {
    mapRef.current?.animateToRegion(
      { latitude: eatery.latitude, longitude: eatery.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      600,
    );
    setSearchQuery('');
    setSearchFocused(false);
    setSelectedEatery(eatery);
  }

  function centreOnUser() {
    if (!location.granted) return;
    mapRef.current?.animateToRegion(
      { latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      600,
    );
  }

  function handleClusterPress(clusterId: number, lat: number, lng: number) {
    const expansionZoom = Math.min(
      supercluster.getClusterExpansionZoom(clusterId),
      CLUSTER_MAX_ZOOM,
    );
    const delta = 360 / Math.pow(2, expansionZoom);
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta },
      400,
    );
  }

  const isSearching = searchQuery.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        onRegionChangeComplete={setRegion}
        showsUserLocation={location.granted}
        showsMyLocationButton={false}
        customMapStyle={darkMapStyle}
      >
        {isSearching ? (
          // Search mode — show individual filtered results, no clustering
          filteredEateries.map(eatery => (
            <MapMarker
              key={eatery.id}
              eatery={eatery}
              status={statuses[eatery.id]}
              onPress={() => setSelectedEatery(eatery)}
            />
          ))
        ) : (
          // Normal mode — render clusters or individual pins
          clusters.map(point => {
            const [lng, lat] = point.geometry.coordinates;
            const coordinate = { latitude: lat, longitude: lng };

            const props = point.properties as { cluster?: boolean; cluster_id?: number; point_count?: number; id?: string };
            if (props.cluster) {
              const { cluster_id, point_count } = props;
              return (
                <Marker
                  key={`cluster-${cluster_id}`}
                  coordinate={coordinate}
                  tracksViewChanges={false}
                  onPress={() => handleClusterPress(cluster_id, lat, lng)}
                >
                  <ClusterBubble count={point_count} />
                </Marker>
              );
            }

            const eatery = props.id ? eateriesById[props.id] : undefined;
            if (!eatery) return null;
            return (
              <MapMarker
                key={eatery.id}
                eatery={eatery}
                status={statuses[eatery.id]}
                onPress={() => setSelectedEatery(eatery)}
              />
            );
          })
        )}
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
          {searchQuery.length > 0 && (
            <View style={styles.searchResults}>
              {filteredEateries.length === 0 ? (
                <Text style={styles.noResults}>No eateries found</Text>
              ) : (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  style={styles.searchResultsScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {filteredEateries.map(eatery => {
                    const status = statuses[eatery.id];
                    const level = status?.level ?? 'no_data';
                    return (
                      <TouchableOpacity
                        key={eatery.id}
                        style={styles.searchResultRow}
                        onPress={() => flyToEatery(eatery)}
                      >
                        <View style={styles.searchResultLeft}>
                          <Text style={styles.searchResultName}>{eatery.name}</Text>
                          <Text style={styles.searchResultType}>
                            {eatery.type.replace(/_/g, ' ')}
                          </Text>
                        </View>
                        <View style={styles.searchResultStatus}>
                          <StatusDot level={level} size={8} />
                          <Text style={[styles.searchResultLevel, { color: getQueueColor(level) }]}>
                            {queueLevelLabel(level)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingBadge}>
          <ActivityIndicator size={16} color={Colors.accent} />
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

      {/* Add a Place button */}
      <TouchableOpacity
        style={styles.addPlaceBtn}
        onPress={() => navigation.navigate('AddEatery')}
      >
        <Text style={styles.addPlaceBtnText}>＋ Add a Place</Text>
      </TouchableOpacity>

      {/* Report FAB */}
      <View style={styles.fabWrap}>
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('ReportQueue', {
              eateryId: selectedEatery?.id ?? '',
              eateryName: selectedEatery?.name ?? '',
            })
          }
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
          navigation.navigate('ReportQueue', {
            eateryId: selectedEatery!.id,
            eateryName: selectedEatery!.name,
          });
          setSelectedEatery(null);
        }}
        onViewDetail={() => {
          navigation.navigate('EateryDetail', { eateryId: selectedEatery!.id });
          setSelectedEatery(null);
        }}
      />
    </View>
  );
}

// Cluster bubble marker
function ClusterBubble({ count }: { count: number }) {
  return (
    <View style={cluster.wrap}>
      <View style={cluster.bubble}>
        <Text style={cluster.text}>{count}</Text>
      </View>
      <View style={cluster.tail} />
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

  topOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
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
  searchInput: { flex: 1, color: Colors.text, fontSize: 14 },
  clearBtn: { color: Colors.subtext, fontSize: 14, padding: 2 },
  searchResults: {
    backgroundColor: 'rgba(22,22,30,0.98)',
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 14, marginTop: 6, overflow: 'hidden',
    maxHeight: 280,
  },
  searchResultsScroll: { flexGrow: 0 },
  searchResultRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  searchResultLeft: { flex: 1, marginRight: 10 },
  searchResultName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  searchResultType: { fontSize: 11, color: Colors.subtext, marginTop: 2, textTransform: 'capitalize' },
  searchResultStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  searchResultLevel: { fontSize: 11, fontWeight: '600' },
  noResults: { padding: 14, color: Colors.subtext, fontSize: 13 },

  loadingBadge: {
    position: 'absolute', top: 100, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(22,22,30,0.95)',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
  },
  loadingText: { fontSize: 12, color: Colors.subtext },

  legend: {
    position: 'absolute', bottom: 160, left: 12,
    backgroundColor: 'rgba(22,22,30,0.95)',
    borderRadius: 12, padding: 10, gap: 5,
    borderWidth: 1, borderColor: Colors.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 10, color: Colors.subtext },

  locationBtn: {
    position: 'absolute', bottom: 160, right: 12,
    backgroundColor: 'rgba(22,22,30,0.95)',
    borderRadius: 12, width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  locationBtnText: { fontSize: 20 },

  // Add a Place — sits above the FAB
  addPlaceBtn: {
    position: 'absolute', bottom: 80, alignSelf: 'center',
    backgroundColor: Colors.card2,
    borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  addPlaceBtnText: { color: Colors.subtext, fontWeight: '600', fontSize: 13 },

  fabWrap: { position: 'absolute', bottom: 24, left: 12, right: 12 },
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

const cluster = StyleSheet.create({
  wrap: { alignItems: 'center' },
  bubble: {
    minWidth: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 8,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 5,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
  },
  text: { color: '#000', fontWeight: '800', fontSize: 13 },
  tail: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopWidth: 7, borderTopColor: Colors.accent,
    marginTop: -1,
  },
});
