export function convertMeasurementValue(value, fromUnit = 'cm', toUnit = 'cm') {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0

  const centimeters = fromUnit === 'in' ? numeric * 2.54 : numeric
  if (toUnit === 'in') return Number((centimeters / 2.54).toFixed(4))
  return Number(centimeters.toFixed(4))
}

export function createDefaultProfile(overrides = {}) {
  return {
    id: 'profile',
    height: null,
    heightUnit: 'cm',
    weight: null,
    weightUnit: 'kg',
    fitNotes: '',
    measurements: [],
    proportions: [],
    fitPreferences: {
      tops: 'regular',
      bottoms: 'straight',
      upperBodyVolume: '',
      lowerBodyVolume: '',
      topLength: '',
      trouserLength: '',
      silhouetteCombinations: [],
      dislikedGarmentTypes: [],
      fitIssues: [],
    },
    ...overrides,
  }
}

function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max)
}

function getFitPreferenceScore(item, preferences = {}) {
  const fitLabel = item?.fit_and_proportions?.apparent_fit || item?.fit || ''
  const preferred = preferences.tops || preferences.bottoms || ''

  if (!fitLabel) return 0.5
  if (preferred && fitLabel.toLowerCase() === String(preferred).toLowerCase()) return 1
  if (preferences.dislikedGarmentTypes?.includes(item?.category || '')) return 0
  return 0.5
}

export function buildFitCompatibility(outfit, profile = {}) {
  if (!Array.isArray(outfit) || outfit.length === 0) return 0.5

  const measurements = Array.isArray(profile?.measurements) ? profile.measurements : []
  const bodyMap = new Map()
  for (const measurement of measurements) {
    const key = String(measurement.name || measurement.type || '').toLowerCase()
    if (!key || !Number.isFinite(Number(measurement.value))) continue
    bodyMap.set(key, Number(measurement.value))
  }

  const prefers = profile?.fitPreferences || {}

  const scores = outfit.map((item) => {
    const category = String(item?.category || '').toLowerCase()
    const fitLabel = item?.fit_and_proportions?.apparent_fit || item?.fit || ''
    const itemPreferenceScore = getFitPreferenceScore(item, prefers)

    const garmentMeasurements = Array.isArray(item?.measurements) ? item.measurements : []
    const garmentMap = new Map()
    for (const measurement of garmentMeasurements) {
      const key = String(measurement.name || measurement.type || '').toLowerCase()
      if (!key || !Number.isFinite(Number(measurement.value))) continue
      garmentMap.set(key, Number(measurement.value))
    }

    let measurementScore = 0.5
    let count = 0
    const compatible = [
      ['chestcircumference', 'chestcircumference'],
      ['waistcircumference', 'waistcircumference'],
      ['hipcircumference', 'hipcircumference'],
      ['inseam', 'inseam'],
      ['outseam', 'outseam'],
      ['sleevellength', 'sleevellength'],
    ]

    for (const [bodyKey, garmentKey] of compatible) {
      if (!bodyMap.has(bodyKey) || !garmentMap.has(garmentKey)) continue
      count += 1
      const bodyValue = bodyMap.get(bodyKey)
      const garmentValue = garmentMap.get(garmentKey)
      const ease = garmentValue - bodyValue
      const preferredEase = category.includes('top') ? 4 : 2
      const range = Math.abs(ease - preferredEase)
      measurementScore = clamp(1 - range / 18)
    }

    const base = count > 0 ? measurementScore : itemPreferenceScore
    return fitLabel ? clamp((base + itemPreferenceScore) / 2) : 0.5
  })

  const average = scores.reduce((sum, value) => sum + value, 0) / scores.length
  return Number(clamp(average).toFixed(3))
}
