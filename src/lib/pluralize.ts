/**
 * Simple pluralization utility for English words
 * Handles common cases and multi-word phrases
 */

// Irregular plurals that don't follow standard rules
const IRREGULAR_PLURALS: Record<string, string> = {
  'person': 'people',
  'man': 'men',
  'woman': 'women',
  'child': 'children',
  'tooth': 'teeth',
  'foot': 'feet',
  'mouse': 'mice',
  'goose': 'geese',
  'ox': 'oxen',
  'analysis': 'analyses',
  'axis': 'axes',
  'crisis': 'crises',
  'index': 'indices',
  'matrix': 'matrices',
  'datum': 'data',
  'medium': 'media',
  'curriculum': 'curricula',
}

// Words that are the same in both singular and plural
const UNCOUNTABLE = new Set([
  'equipment',
  'information',
  'rice',
  'money',
  'species',
  'series',
  'fish',
  'sheep',
  'deer',
  'aircraft',
  'capacity',
  'inventory',
  'demand',
  'supply',
])

export function pluralize(word: string): string {
  if (!word || word.trim().length === 0) {
    return word
  }

  const trimmed = word.trim()

  // Handle multi-word phrases by pluralizing the last word
  if (trimmed.includes(' ')) {
    const words = trimmed.split(' ')
    const lastWord = words[words.length - 1]
    const pluralLastWord = pluralizeSingleWord(lastWord)
    words[words.length - 1] = pluralLastWord
    return words.join(' ')
  }

  return pluralizeSingleWord(trimmed)
}

function pluralizeSingleWord(word: string): string {
  const lowerWord = word.toLowerCase()

  // Check if it's already plural (ends with 's', but not special cases)
  // This is a simple heuristic - if word ends with 's' and is longer than 3 chars
  // we assume it might be plural already
  // Exception: words ending in 'ss' like 'class' should still be pluralized
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) {
    return word
  }

  // Check uncountable words
  if (UNCOUNTABLE.has(lowerWord)) {
    return word
  }

  // Check irregular plurals
  if (IRREGULAR_PLURALS[lowerWord]) {
    // Preserve original capitalization
    if (word[0] === word[0].toUpperCase()) {
      const plural = IRREGULAR_PLURALS[lowerWord]
      return plural.charAt(0).toUpperCase() + plural.slice(1)
    }
    return IRREGULAR_PLURALS[lowerWord]
  }

  // Apply standard pluralization rules

  // Words ending in s, x, z, ch, sh → add 'es'
  if (/[sxz]$/.test(lowerWord) || /[cs]h$/.test(lowerWord)) {
    return word + 'es'
  }

  // Words ending in consonant + y → change y to ies
  if (/[^aeiou]y$/.test(lowerWord)) {
    return word.slice(0, -1) + 'ies'
  }

  // Words ending in vowel + y → add s
  if (/[aeiou]y$/.test(lowerWord)) {
    return word + 's'
  }

  // Words ending in f or fe → change to ves
  if (/fe?$/.test(lowerWord)) {
    if (lowerWord.endsWith('fe')) {
      return word.slice(0, -2) + 'ves'
    }
    return word.slice(0, -1) + 'ves'
  }

  // Words ending in consonant + o → add es
  // (but not always - this is a simplification, e.g., 'photo' → 'photos')
  if (/[^aeiou]o$/.test(lowerWord)) {
    // Common words that just add 's'
    const exceptionWords = ['photo', 'piano', 'halo', 'memo', 'pro', 'auto']
    if (exceptionWords.includes(lowerWord)) {
      return word + 's'
    }
    return word + 'es'
  }

  // Default: just add 's'
  return word + 's'
}

/**
 * Creates an object with both singular and plural forms
 */
export function createLabelPair(singular: string) {
  return {
    singular,
    plural: pluralize(singular),
  }
}

/**
 * Converts a labels object with only singular forms to include plural forms
 */
export function addPlurals<T extends Record<string, string>>(
  singularLabels: T
): T & Record<string, string> {
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(singularLabels)) {
    result[key] = value
    // If the key ends with 'Label', add a corresponding plural key
    if (key.endsWith('Label')) {
      const pluralKey = key.replace('Label', 'LabelPlural')
      result[pluralKey] = pluralize(value)
    }
  }

  return result as T & Record<string, string>
}
