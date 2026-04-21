import { QueueLevel } from '@types/queue';

/** Returns the map marker colour based on queue level */
export function markerColor(level: QueueLevel | 'no_data'): string {
  switch (level) {
    case 'short':   return '#34C759';
    case 'medium':  return '#FF9500';
    case 'long':    return '#FF3B30';
    default:        return '#8E8E93';
  }
}

/** Calculate distance in km between two lat/lng points */
export function distanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Format distance nicely */
export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}
