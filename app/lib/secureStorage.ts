import * as SecureStore from 'expo-secure-store';

/**
 * Encrypted storage adapter for the Supabase auth session.
 *
 * Supabase stores the whole session (access token + refresh token + user) as a
 * single value, which can exceed expo-secure-store's ~2KB per-item limit. We
 * transparently chunk large values across multiple keychain entries so the
 * token never falls back to plaintext.
 *
 * SecureStore keys allow [A-Za-z0-9._-], so the Supabase key name and our
 * numeric chunk suffixes are both valid.
 */

const CHUNK_PREFIX = '__chunks__:';
const CHUNK_SIZE = 2000; // stay safely under SecureStore's 2048-byte warning

async function getItem(key: string): Promise<string | null> {
  const head = await SecureStore.getItemAsync(key);
  if (head === null) return null;
  if (!head.startsWith(CHUNK_PREFIX)) return head; // small value stored inline

  const count = parseInt(head.slice(CHUNK_PREFIX.length), 10);
  let result = '';
  for (let i = 0; i < count; i++) {
    const part = await SecureStore.getItemAsync(`${key}__${i}`);
    if (part === null) return null; // partial/corrupt — treat as no session
    result += part;
  }
  return result;
}

async function setItem(key: string, value: string): Promise<void> {
  await removeItem(key); // clear any prior inline value or chunk set first

  if (value.length <= CHUNK_SIZE) {
    await SecureStore.setItemAsync(key, value);
    return;
  }

  const count = Math.ceil(value.length / CHUNK_SIZE);
  await SecureStore.setItemAsync(key, `${CHUNK_PREFIX}${count}`);
  for (let i = 0; i < count; i++) {
    await SecureStore.setItemAsync(
      `${key}__${i}`,
      value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
    );
  }
}

async function removeItem(key: string): Promise<void> {
  const head = await SecureStore.getItemAsync(key);
  if (head?.startsWith(CHUNK_PREFIX)) {
    const count = parseInt(head.slice(CHUNK_PREFIX.length), 10);
    for (let i = 0; i < count; i++) {
      await SecureStore.deleteItemAsync(`${key}__${i}`);
    }
  }
  await SecureStore.deleteItemAsync(key);
}

export const SecureStoreAdapter = { getItem, setItem, removeItem };
