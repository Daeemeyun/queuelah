import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Config } from '@constants/config';

interface LocationState {
  latitude: number;
  longitude: number;
  /** The user granted location permission. */
  granted: boolean;
  /**
   * The coordinates are the Singapore CBD default, not the user's real position:
   * either permission was denied, or it was granted but no fix was available.
   * Screens showing distances must say so, or "3 min away" is measured from
   * Raffles Place without the user knowing.
   */
  usingDefault: boolean;
  loading: boolean;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationState>({
    latitude: Config.MAP_DEFAULT_LAT,
    longitude: Config.MAP_DEFAULT_LNG,
    granted: false,
    usingDefault: true,
    loading: true,
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocation((l) => ({ ...l, granted: false, usingDefault: true, loading: false }));
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          granted: true,
          usingDefault: false,
          loading: false,
        });
      } catch {
        // Permission granted but no fix (simulator, indoors, GPS off). Still the
        // CBD default, so flag it rather than pretending we know where they are.
        setLocation((l) => ({ ...l, granted: true, usingDefault: true, loading: false }));
      }
    })();
  }, []);

  return location;
}
