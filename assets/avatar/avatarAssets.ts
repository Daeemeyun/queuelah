import { HatKey, EyewearKey, FloatItemKey, CompanionKey } from '@types/user';

// Base character
export const BASE_CHARACTER = require('./base/base_character.png');

// Hats
export const HAT_ASSETS: Record<HatKey, any> = {
  kopitiam:   require('./hats/hat_01_kopitiam.png'),
  beanie:     require('./hats/hat_02_beanie.png'),
  graduation: require('./hats/hat_03_graduation.png'),
};

// Eyewear
export const EYEWEAR_ASSETS: Record<EyewearKey, any> = {
  aviators: require('./eyewear/eyewear_01_aviators.png'),
  reading:  require('./eyewear/eyewear_02_reading.png'),
  hearts:   require('./eyewear/eyewear_03_hearts.png'),
};

// Float items (cut from float_sheet_raw.png)
export const FLOAT_ITEM_ASSETS: Record<FloatItemKey, any> = {
  teh_tarik:  require('./float_items/float_01_teh_tarik.png'),
  kaya_toast: require('./float_items/float_02_kaya_toast.png'),
  ang_pao:    require('./float_items/float_03_ang_pao.png'),
};

// Companions
export const COMPANION_ASSETS: Record<CompanionKey, any> = {
  baby_blob: require('./companions/companion_01_baby_blob.png'),
};

// ─── Picker metadata ──────────────────────────────────────────────────────────

export const HAT_OPTIONS: { key: HatKey; label: string }[] = [
  { key: 'kopitiam',   label: 'Kopitiam Cap' },
  { key: 'beanie',     label: 'Beanie' },
  { key: 'graduation', label: 'Grad Cap' },
];

export const EYEWEAR_OPTIONS: { key: EyewearKey; label: string }[] = [
  { key: 'aviators', label: 'Aviators' },
  { key: 'reading',  label: 'Reading' },
  { key: 'hearts',   label: 'Hearts' },
];

export const FLOAT_ITEM_OPTIONS: { key: FloatItemKey; label: string }[] = [
  { key: 'teh_tarik',  label: 'Teh Tarik' },
  { key: 'kaya_toast', label: 'Kaya Toast' },
  { key: 'ang_pao',    label: 'Ang Pao' },
];

export const COMPANION_OPTIONS: { key: CompanionKey; label: string }[] = [
  { key: 'baby_blob', label: 'Baby Blob' },
];
