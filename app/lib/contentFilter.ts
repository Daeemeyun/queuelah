/**
 * Lightweight content filter — no external dependencies.
 * Checks for profanity, threats, and disallowed content before posting.
 */

// Common profanity list (partial — covers the most frequent terms)
const PROFANITY = [
  'fuck', 'shit', 'ass', 'bitch', 'bastard', 'cunt', 'dick', 'cock',
  'pussy', 'whore', 'slut', 'piss', 'damn', 'crap', 'motherfucker',
  'asshole', 'bullshit', 'jackass', 'prick', 'twat', 'wanker',
  // Singlish variants
  'cb', 'ccb', 'knn', 'lj', 'bj', 'nb',
];

const THREATS = [
  'kill', 'murder', 'bomb', 'attack', 'threat', 'die', 'hurt', 'harm',
  'shoot', 'stab', 'rape',
];

const SPAM = ['scam', 'phish', 'spam'];

// Match whole words only, case-insensitive
function containsWord(text: string, words: string[]): string | null {
  const lower = text.toLowerCase();
  for (const word of words) {
    const pattern = new RegExp(`\\b${word}\\b`, 'i');
    if (pattern.test(lower)) return word;
  }
  return null;
}

export interface FilterResult {
  clean: boolean;
  reason?: string;
}

/** Check title + body before a forum post is submitted */
export function checkContent(title: string, body: string): FilterResult {
  const combined = `${title} ${body}`;

  // Length checks first
  if (title.trim().length < 5) {
    return { clean: false, reason: 'Title is too short. Please write at least 5 characters.' };
  }
  if (body.trim().length < 10) {
    return { clean: false, reason: 'Post body is too short. Please write at least 10 characters.' };
  }

  // No links
  if (/https?:\/\/\S+/.test(combined)) {
    return { clean: false, reason: 'Links are not allowed in forum posts.' };
  }

  // Profanity
  if (containsWord(combined, PROFANITY)) {
    return { clean: false, reason: 'Your post contains inappropriate language. Please revise before submitting.' };
  }

  // Threats
  if (containsWord(combined, THREATS)) {
    return { clean: false, reason: 'Your post contains content that is not allowed. Please revise before submitting.' };
  }

  // Spam
  if (containsWord(combined, SPAM)) {
    return { clean: false, reason: 'Your post contains content that is not allowed. Please revise before submitting.' };
  }

  return { clean: true };
}
