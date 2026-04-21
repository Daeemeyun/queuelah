export type EateryType = 'hawker_centre' | 'restaurant' | 'cafe' | 'food_court';

export interface Eatery {
  id: string;
  name: string;
  type: EateryType;
  address: string;
  latitude: number;
  longitude: number;
  opening_hours: string;      // e.g. "7:00 AM – 9:00 PM"
  photo_url?: string;
  has_stalls: boolean;        // true for hawker centres with stall-level data
  source: 'seeded' | 'user_submitted';
  submitted_by?: string;
  verified: boolean;
  is_featured: boolean;
  featured_until?: string;
  created_at: string;
}

export interface Stall {
  id: string;
  eatery_id: string;
  name: string;               // e.g. "Tian Tian Chicken Rice"
  stall_number?: string;      // e.g. "#01-10"
  food_type: string;          // e.g. "Chicken Rice"
  created_at: string;
}
