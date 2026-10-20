import { pairCompatibility } from './pairCompatibility.js'
import { colorCompatibility } from './colorCompatibility.js'
import { silhouetteAlignment } from './silhouette.js'

function globalOutfitScore(outfit) {
  const pairScores = []
  const paletteScores = []
  const formalityScores = []

  for (let i = 0; i < outfit.length; i += 1) {
    for (let j = i + 1; j < outfit.length; j += 1) {
      const pairScore = pairCompatibility(outfit[i], outfit[j])
      pairScores.push(pairScore)
      paletteScores.push(colorCompatibility(outfit[i], outfit[j]))
      const formalityA = outfit[i]?.attributes?.formality_estimate ?? outfit[i]?.formality ?? 0.5
      const formalityB = outfit[j]?.attributes?.formality_estimate ?? outfit[j]?.formality ?? 0.5
      formalityScores.push(1 - Math.abs(formalityA - formalityB))
    }
  }

  const palette = pairScores.length ? paletteScores.reduce((sum, value) => sum + value, 0) / paletteScores.length : 0.5
  const formality = formalityScores.length ? formalityScores.reduce((sum, value) => sum + value, 0) / formalityScores.length : 0.5
  const pairAverage = pairScores.length ? pairScores.reduce((sum, value) => sum + value, 0) / pairScores.length : 0.5

  return (pairAverage * 0.7 + ((palette + formality) / 2) * 0.3)
}

export function outfitCompatibility(outfit) {
  if (!Array.isArray(outfit) || outfit.length < 2) return 0.5

  const pairScores = []
  for (let i = 0; i < outfit.length; i += 1) {
    for (let j = i + 1; j < outfit.length; j += 1) {
      pairScores.push(pairCompatibility(outfit[i], outfit[j]))
    }
  }

  const pairAverage = pairScores.length
    ? pairScores.reduce((sum, score) => sum + score, 0) / pairScores.length
    : 0.5

  const global = globalOutfitScore(outfit)
  const final = 0.7 * pairAverage + 0.3 * global
  return Number(Math.min(Math.max(final, 0), 1).toFixed(3))
}
