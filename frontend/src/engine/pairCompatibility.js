import { scoringConfig } from '../data/scoringConfig.js'
import { colorCompatibility } from './colorCompatibility.js'

function garmentFormality(item) {
  const formality = item?.attributes?.formality_estimate ?? item?.formality ?? item?.attributes?.formality
  if (typeof formality === 'number') return Math.max(0, Math.min(1, formality))
  if (typeof item?.formality === 'number') return Math.max(0, Math.min(1, item.formality / 5))
  return 0.5
}

function patternOf(item) {
  return item?.visual_attributes?.pattern || item?.pattern || 'solid'
}

function styleSet(item) {
  const fromTags = item?.style_associations?.possible_aesthetics || item?.style_associations || []
  if (Array.isArray(fromTags)) return new Set(fromTags.map(String))
  if (fromTags && typeof fromTags === 'object') {
    return new Set(Object.keys(fromTags))
  }
  const styleValue = item?.style || item?.aesthetic || ''
  return styleValue ? new Set([styleValue]) : new Set()
}

function jaccard(setA, setB) {
  const union = new Set([...setA, ...setB])
  if (!union.size) return 0.5
  const intersection = [...union].filter((value) => setA.has(value) && setB.has(value)).length
  return intersection / union.size
}

export function pairCompatibility(a, b) {
  if (!a || !b) return scoringConfig.neutralScore

  const styleScore = jaccard(styleSet(a), styleSet(b))
  const colorScore = colorCompatibility(a, b)
  const patternTable = scoringConfig.patternCompatibilityTable || {}
  const patternA = patternOf(a)
  const patternB = patternOf(b)
  const patternScore = patternTable[patternA]?.[patternB] ?? scoringConfig.neutralScore
  const formalityScore = 1 - Math.abs(garmentFormality(a) - garmentFormality(b))

  const weights = scoringConfig.pairwiseWeights
  const numerator =
    colorScore * weights.color +
    patternScore * weights.pattern +
    formalityScore * weights.formality +
    styleScore * weights.style

  const total = Object.values(weights).reduce((sum, value) => sum + value, 0)
  return Number((numerator / total).toFixed(3))
}
