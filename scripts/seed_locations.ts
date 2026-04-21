/**
 * seed_locations.ts
 * One-time script to populate the eateries table with Singapore food locations.
 *
 * Sources:
 *  1. OpenStreetMap Overpass API — restaurants, cafes, food courts, hawker centres (free, no key)
 *  2. data.gov.sg NEA Hawker Centres dataset (free, official)
 *
 * Usage:
 *  npx tsx scripts/seed_locations.ts
 *
 * Required env vars (add to .env or export before running):
 *  EXPO_PUBLIC_SUPABASE_URL   — your Supabase project URL
 *  SUPABASE_SERVICE_KEY       — service role key (bypasses RLS)
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY env vars.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── Types ────────────────────────────────────────────────────────────────────

type EateryType = 'hawker_centre' | 'restaurant' | 'cafe' | 'food_court';

interface EateryInsert {
  name: string;
  type: EateryType;
  address: string;
  latitude: number;
  longitude: number;
  opening_hours: string;
  has_stalls: boolean;
  source: 'seeded';
  verified: boolean;
}

// ─── OSM Overpass ─────────────────────────────────────────────────────────────

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const OVERPASS_QUERY = `
[out:json][timeout:120];
area["name"="Singapore"]["admin_level"="2"]->.sg;
(
  node["amenity"~"^(restaurant|cafe|food_court|hawker_centre)$"]["name"](area.sg);
  way["amenity"~"^(restaurant|cafe|food_court|hawker_centre)$"]["name"](area.sg);
);
out center;
`.trim();

function osmAmenityToType(amenity: string): EateryType {
  if (amenity === 'hawker_centre') return 'hawker_centre';
  if (amenity === 'food_court')    return 'food_court';
  if (amenity === 'cafe')          return 'cafe';
  return 'restaurant';
}

async function fetchOsmEateries(): Promise<EateryInsert[]> {
  console.log('Fetching from OpenStreetMap Overpass API...');

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
  });

  if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);

  const json = await res.json() as { elements: any[] };

  const results: EateryInsert[] = [];

  for (const el of json.elements) {
    const name: string | undefined = el.tags?.name;
    if (!name || name.trim() === '') continue;

    const lat: number = el.type === 'way' ? el.center?.lat : el.lat;
    const lng: number = el.type === 'way' ? el.center?.lon : el.lon;
    if (!lat || !lng) continue;

    const amenity: string = el.tags?.amenity ?? 'restaurant';
    const type = osmAmenityToType(amenity);
    const openingHours: string = el.tags?.opening_hours ?? '';
    const address = [
      el.tags?.['addr:housenumber'],
      el.tags?.['addr:street'],
      el.tags?.['addr:postcode'] ? `Singapore ${el.tags['addr:postcode']}` : 'Singapore',
    ].filter(Boolean).join(' ');

    results.push({
      name: name.trim(),
      type,
      address: address || 'Singapore',
      latitude: lat,
      longitude: lng,
      opening_hours: openingHours,
      has_stalls: type === 'hawker_centre',
      source: 'seeded',
      verified: true,
    });
  }

  console.log(`  → ${results.length} places from OSM`);
  return results;
}

// ─── data.gov.sg Hawker Centres ───────────────────────────────────────────────

// NEA Hawker Centres dataset resource ID
const DATAGOV_URL =
  'https://data.gov.sg/api/action/datastore_search' +
  '?resource_id=b80cb643-a732-480d-86b5-e03957bc82aa&limit=500';

async function fetchGovHawkerCentres(): Promise<EateryInsert[]> {
  console.log('Fetching from data.gov.sg NEA Hawker Centres...');

  try {
    const res = await fetch(DATAGOV_URL);
    if (!res.ok) {
      console.warn(`  data.gov.sg returned ${res.status}, skipping.`);
      return [];
    }
    const json = await res.json() as { result?: { records?: any[] } };
    const records = json.result?.records ?? [];

    const results: EateryInsert[] = records
      .filter((r: any) => r.name && r.latitude_hc && r.longitude_hc)
      .map((r: any) => ({
        name: r.name.trim(),
        type: 'hawker_centre' as EateryType,
        address: r.address_myenv?.trim() ?? 'Singapore',
        latitude: parseFloat(r.latitude_hc),
        longitude: parseFloat(r.longitude_hc),
        opening_hours: '',
        has_stalls: true,
        source: 'seeded' as const,
        verified: true,
      }));

    console.log(`  → ${results.length} hawker centres from data.gov.sg`);
    return results;
  } catch (err) {
    console.warn('  data.gov.sg fetch failed, skipping:', err);
    return [];
  }
}

// ─── Deduplication ────────────────────────────────────────────────────────────

/** Remove duplicates: same name within ~100m radius */
function deduplicate(eateries: EateryInsert[]): EateryInsert[] {
  const seen: EateryInsert[] = [];

  for (const e of eateries) {
    const isDuplicate = seen.some(s => {
      const dLat = Math.abs(s.latitude  - e.latitude);
      const dLng = Math.abs(s.longitude - e.longitude);
      return dLat < 0.001 && dLng < 0.001 &&
        s.name.toLowerCase() === e.name.toLowerCase();
    });
    if (!isDuplicate) seen.push(e);
  }

  return seen;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Fetch from both sources
  const [osmData, govData] = await Promise.all([
    fetchOsmEateries(),
    fetchGovHawkerCentres(),
  ]);

  // Merge: gov data takes precedence for hawker centres (more accurate names)
  const combined = deduplicate([...govData, ...osmData]);
  console.log(`\nTotal after deduplication: ${combined.length} places`);

  // Insert in batches to avoid request size limits
  const BATCH = 200;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < combined.length; i += BATCH) {
    const batch = combined.slice(i, i + BATCH);

    const { error, count } = await supabase
      .from('eateries')
      .upsert(batch, {
        onConflict: 'name,latitude,longitude',
        ignoreDuplicates: true,
        count: 'exact',
      });

    if (error) {
      // upsert on conflict might not be supported for composite unique constraint
      // fall back to plain insert with ignoreDuplicates
      const { error: e2, count: c2 } = await supabase
        .from('eateries')
        .insert(batch, { count: 'exact' });

      if (e2) {
        console.error(`  Batch ${i}–${i + BATCH}: error`, e2.message);
        skipped += batch.length;
      } else {
        inserted += (c2 ?? 0);
      }
    } else {
      inserted += (count ?? 0);
    }

    process.stdout.write(`\r  Progress: ${Math.min(i + BATCH, combined.length)}/${combined.length}`);
  }

  console.log(`\n\nDone. Inserted: ${inserted}, skipped/errored: ${skipped + (combined.length - inserted - skipped)}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
