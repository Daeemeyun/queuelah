import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Config } from '@constants/config';

interface LocationState {
  latitude: number;
  longitude: number;
  granted: boolean;
  loading: boolean;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationState>({
    latitude: Config.MAP_DEFAULT_LAT,
    longitude: Config.MAP_DEFAULT_LNG,
    granted: false,
    loading: true,
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocation((l) => ({ ...l, granted: false, loading: false }));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        granted: true,
        loading: false,
      });
    })();
  }, []);

  return location;
}
