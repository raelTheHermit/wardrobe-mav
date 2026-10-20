import { generateCandidates } from './candidateGenerator.js'
import { rankOutfit } from './ranker.js'
import { normalizeGarments, validateOutfit } from './validation.js'

export function generateOutfits({ garments, context = 'casual', preferences = {}, history = [], limit = 5, profile = null }) {
  const validGarments = normalizeGarments(garments).filter((item) => item.status !== 'unavailable')
  if (!validGarments.length) return []

  const candidates = generateCandidates(validGarments, 4)
    .filter((outfit) => validateOutfit(outfit))
    .map((outfit) => ({
      id: outfit.map((item) => item.id).join('-'),
      outfit,
      ...rankOutfit(outfit, context, preferences, history, profile),
    }))
    .filter((entry) => entry.score >= 0.38)
    .sort((a, b) => b.score - a.score)

  const unique = []
  const seen = new Set()
  for (const entry of candidates) {
    const key = entry.outfit.map((item) => item.id).sort().join('|')
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(entry)
  }

  return unique.slice(0, limit).map((entry) => ({
    id: entry.id,
    outfit: entry.outfit,
    score: entry.score,
    breakdown: entry.breakdown,
    evidenceCoverage: entry.evidenceCoverage,
  }))
}

export { generateCandidates, rankOutfit, normalizeGarments }
