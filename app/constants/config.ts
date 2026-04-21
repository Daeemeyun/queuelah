export const Config = {
  // How long a queue report stays valid (milliseconds)
  REPORT_EXPIRY_MS: 30 * 60 * 1000, // 30 minutes

  // Cooldown before same device can re-report same stall
  REPORT_COOLDOWN_MS: 15 * 60 * 1000, // 15 minutes

  // Queue thresholds (minutes)
  QUEUE_SHORT_MAX: 10,
  QUEUE_MEDIUM_MAX: 30,

  // Map defaults — centred on Singapore CBD
  MAP_DEFAULT_LAT: 1.3521,
  MAP_DEFAULT_LNG: 103.8198,
  MAP_DEFAULT_DELTA: 0.05,

  // Points awarded per action
  POINTS_REPORT: 10,
  POINTS_CONFIRMED_REPORT: 5,  // bonus when community confirms your report
  POINTS_FIRST_DAILY: 20,      // bonus for first report of the day

  // Streak config
  STREAK_GRACE_HOURS: 26, // hours before streak breaks (slight grace period)
};
