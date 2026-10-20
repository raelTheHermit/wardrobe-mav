import { scoringConfig } from '../data/scoringConfig.js'
import { buildFitCompatibility } from '../utils/bodyProfile.js'
import { contextMatch } from './contextMatch.js'
import { novelty } from './novelty.js'
import { outfitCompatibility } from './outfitCompatibility.js'
import { personalPreference } from './personalPreference.js'
import { silhouettePreferenceScore } from './silhouette.js'
import { styleMatch } from './styleMatch.js'

export function rankOutfit(outfit, context = 'casual', preferences = {}, history = [], profile = null) {
  const compatibility = outfitCompatibility(outfit)
  const requestedAesthetic = preferences.aesthetic || preferences.favoriteAesthetic || null
  const aesthetic = requestedAesthetic ? styleMatch(outfit, requestedAesthetic) : 0.5
  const contextScore = contextMatch(outfit, context)
  const personal = personalPreference(outfit, preferences)
  const silhouette = silhouettePreferenceScore(outfit, preferences)
  const noveltyScore = novelty(outfit, history)
  const fitScore = profile ? buildFitCompatibility(outfit, profile) : null

  const baseWeights = { ...scoringConfig.mainWeights }
  if (fitScore !== null) {
    baseWeights.fit = 0.09
  }
  const baseTotal = Object.values(baseWeights).reduce((sum, value) => sum + value, 0)

  const weightEntries = [
    ['compatibility', baseWeights.compatibility],
    ['context', baseWeights.context],
    ['personal', baseWeights.personal],
    ['silhouette', baseWeights.silhouette],
    ['novelty', baseWeights.novelty],
  ]

  if (requestedAesthetic) {
    weightEntries.push(['aesthetic', baseWeights.aesthetic])
  }
  if (fitScore !== null) {
    weightEntries.push(['fit', baseWeights.fit])
  }

  let score =
    compatibility * baseWeights.compatibility +
    contextScore * baseWeights.context +
    personal * baseWeights.personal +
    silhouette * baseWeights.silhouette +
    noveltyScore * baseWeights.novelty

  if (requestedAesthetic) {
    score += aesthetic * baseWeights.aesthetic
  }

  if (fitScore !== null) {
    score += fitScore * baseWeights.fit
  }

  const adjustedScore = requestedAesthetic ? score : score / (baseTotal - (requestedAesthetic ? baseWeights.aesthetic : 0)) * baseTotal
  const finalScore = Number(Math.min(Math.max(adjustedScore + noveltyScore * 0.03, 0), 1.2).toFixed(3))

  return {
    score: finalScore,
    breakdown: {
      compatibility,
      aesthetic: requestedAesthetic ? aesthetic : 0,
      context: contextScore,
      personal,
      silhouette,
      novelty: noveltyScore,
      fit: fitScore ?? 0.5,
    },
    evidenceCoverage: fitScore === null ? 0.8 : 0.9,
    weights: weightEntries,
  }
}
