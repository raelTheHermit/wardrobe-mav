import { scoringConfig } from '../data/scoringConfig.js'

function getItemSuitability(item, context) {
  const contextualTags = Array.isArray(context) ? context : [context]
  const itemTags = [
    ...(item?.attributes?.seasonal_suitability || []),
    ...(item?.attributes?.functional_tags || []),
    ...(item?.tags || []),
    item?.occasion,
    item?.season,
  ]
    .map((tag) => String(tag).toLowerCase())
    .filter(Boolean)

  const directMatch = contextualTags.some((tag) => itemTags.includes(String(tag).toLowerCase()))
  if (directMatch) return 1

  const formalityTarget = typeof context?.formality_target === 'number' ? context.formality_target : 0.5
  const itemFormality = item?.attributes?.formality_estimate ?? item?.formality ?? 0.5
  const formalityScore = 1 - Math.abs(itemFormality - formalityTarget)

  const weatherValue = context?.weather || context?.temperature
  if (typeof weatherValue === 'number') {
    const seasonTags = item?.attributes?.seasonal_suitability || []
    const weatherTag = weatherValue > 28 ? 'hot_weather' : weatherValue < 15 ? 'cold_weather' : 'mild_weather'
    if (seasonTags.includes(weatherTag)) return 0.8
  }

  return Number((0.45 + formalityScore * 0.55).toFixed(3))
}

export function contextMatch(outfit, context = 'casual') {
  if (!Array.isArray(outfit) || !outfit.length) return 0.5

  const contextValues = {
    casual: ['casual', 'everyday_wear', 'mild_weather', 'hot_weather'],
    formal: ['formal', 'evening', 'workday', 'smart_casual'],
    warm: ['hot_weather', 'summer', 'casual', 'weekend'],
    cold: ['cold_weather', 'winter', 'workday'],
    rainy: ['rain_protection', 'workday', 'smart_casual'],
  }

  const contextKey = context && typeof context === 'string' ? context.toLowerCase() : 'casual'
  const activeValues = typeof context === 'object' ? [
    context.occasion,
    context.activity,
    context.weather,
    context.location,
  ] : contextValues[contextKey] || contextValues.casual

  const scores = outfit.map((item) => getItemSuitability(item, activeValues))
  const average = scores.reduce((sum, value) => sum + value, 0) / scores.length
  return Number(Math.min(Math.max(average, 0), 1).toFixed(3))
}
