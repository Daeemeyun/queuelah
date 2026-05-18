export type SubscriptionTier = 'free' | 'pro';
export type AvatarFrame      = 'none' | 'gold' | 'glow' | 'gradient';
export type UsernameColor    = 'default' | 'gold' | 'blue' | 'purple' | 'red';

export type HatKey       = 'kopitiam' | 'beanie' | 'graduation';
export type EyewearKey   = 'aviators' | 'reading' | 'hearts';
export type FloatItemKey = 'teh_tarik' | 'kaya_toast' | 'ang_pao';
export type CompanionKey = 'baby_blob';

export interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
  points: number;
  streak_days: number;
  last_report_at?: string;
  subscription_tier: SubscriptionTier;
  avatar_frame: AvatarFrame;
  username_color: UsernameColor;
  avatar_hat?: HatKey | null;
  avatar_eyewear?: EyewearKey | null;
  avatar_float_item?: FloatItemKey | null;
  avatar_companion?: CompanionKey | null;
  is_admin: boolean;
  created_at: string;
}

export interface Badge {
  id: string;
  key: string;               // e.g. 'hawker_hero'
  name: string;              // e.g. 'Hawker Hero'
  description: string;
  icon: string;              // emoji
  requirement: string;       // human-readable requirement
  earned_at?: string;        // null if not yet earned
}

export interface UserBadge {
  user_id: string;
  badge_key: string;
  earned_at: string;
}
