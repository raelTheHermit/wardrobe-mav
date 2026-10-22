export function convertMeasurementValue(value, fromUnit = 'cm', toUnit = 'cm') {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0

  const centimeters = fromUnit === 'in' ? numeric * 2.54 : numeric
  if (toUnit === 'in') return Number((centimeters / 2.54).toFixed(4))
  return Number(centimeters.toFixed(4))
}

export function createDefaultProfile(overrides = {}) {
  const hasMeasurementsOverride = Object.prototype.hasOwnProperty.call(overrides, 'measurements')
  const defaultMeasurements = [
    { name: 'bust', value: 90, unit: 'cm' },
    { name: 'waist', value: 68, unit: 'cm' },
    { name: 'hip', value: 96, unit: 'cm' },
    { name: 'inseam', value: 79, unit: 'cm' },
  ]

  const resolvedMeasurements = hasMeasurementsOverride
    ? overrides.measurements
    : Object.keys(overrides).length === 0
      ? defaultMeasurements
      : []

  return {
    id: 'profile',
    name: 'Rael Morgan',
    height: 172,
    heightUnit: 'cm',
    weight: 62,
    weightUnit: 'kg',
    fitNotes: 'Balanced proportions, prefers softly tailored silhouettes and easy layering.',
    measurements: resolvedMeasurements,
    proportions: ['average', 'slim-waist', 'balanced-hips'],
    fitPreferences: {
      tops: 'regular',
      bottoms: 'straight',
      upperBodyVolume: 'balanced',
      lowerBodyVolume: 'straight',
      topLength: 'waist',
      trouserLength: 'ankle',
      silhouetteCombinations: ['relaxed-top', 'straight-trouser'],
      dislikedGarmentTypes: [],
      fitIssues: ['boxy shoulders'],
    },
    ...overrides,
  }
}

function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max)
}

function normalizeSizeToken(value) {
  if (value === null || value === undefined || value === '') return null
  return String(value).trim().toLowerCase()
}

function sizeLabelToNumber(label) {
  const normalized = normalizeSizeToken(label)
  if (!normalized) return null

  const plain = normalized.replace(/[^0-9.]/g, '')
  if (plain) {
    const numeric = Number(plain)
    if (Number.isFinite(numeric)) return numeric
  }

  const sizeMap = {
    xs: 4,
    xsmall: 4,
    s: 6,
    small: 6,
    m: 8,
    medium: 8,
    l: 10,
    large: 10,
    xl: 12,
    xlarge: 12,
    xxl: 14,
    xxlarge: 14,
    xxxl: 16,
    xxxlarge: 16,
  }

  if (sizeMap[normalized] !== undefined) return sizeMap[normalized]

  if (normalized.startsWith('2xl') || normalized.startsWith('xxl')) return 14
  if (normalized.startsWith('3xl') || normalized.startsWith('xxxl')) return 16
  if (normalized.startsWith('1xl')) return 12
  if (normalized.startsWith('0')) return 0

  return null
}

function getSizeMatchScore(item, profile = {}) {
  const itemSize = normalizeSizeToken(item?.size)
  const measurements = Array.isArray(profile?.measurements) ? profile.measurements : []
  if (!itemSize || !measurements.length) return 0.5

  const bodyMap = new Map()
  for (const measurement of measurements) {
    const key = String(measurement.name || measurement.type || '').toLowerCase()
    const numeric = Number(measurement.value)
    if (!key || !Number.isFinite(numeric)) continue
    bodyMap.set(key, numeric)
  }

  const garmentMeasurements = Array.isArray(item?.measurements) ? item.measurements : []
  const measurementMap = new Map()
  for (const measurement of garmentMeasurements) {
    const key = String(measurement.name || measurement.type || '').toLowerCase()
    const numeric = Number(measurement.value)
    if (!key || !Number.isFinite(numeric)) continue
    measurementMap.set(key, numeric)
  }

  const bodyWaist = bodyMap.get('waistcircumference') ?? bodyMap.get('waist')
  const bodyChest = bodyMap.get('chestcircumference') ?? bodyMap.get('chest')
  const bodyHip = bodyMap.get('hipcircumference') ?? bodyMap.get('hip')

  const garmentWaist = measurementMap.get('waistcircumference') ?? measurementMap.get('waist')
  const garmentChest = measurementMap.get('chestcircumference') ?? measurementMap.get('chest')
  const garmentHip = measurementMap.get('hipcircumference') ?? measurementMap.get('hip')

  const numericSize = sizeLabelToNumber(itemSize)
  const bodySizeEstimate = [
    bodyWaist ? bodyWaist / 8.5 : null,
    bodyChest ? bodyChest / 14 : null,
    bodyHip ? bodyHip / 11 : null,
  ].filter((value) => Number.isFinite(value)).reduce((sum, value) => sum + value, 0) / 2

  if (Number.isFinite(bodySizeEstimate) && numericSize !== null) {
    const labelScore = clamp(1 - Math.abs(numericSize - bodySizeEstimate) / 6)
    const measurementScore = [
      garmentWaist && bodyWaist ? clamp(1 - Math.abs(garmentWaist - bodyWaist) / 18) : null,
      garmentChest && bodyChest ? clamp(1 - Math.abs(garmentChest - bodyChest) / 18) : null,
      garmentHip && bodyHip ? clamp(1 - Math.abs(garmentHip - bodyHip) / 18) : null,
    ].filter((value) => Number.isFinite(value)).reduce((sum, value) => sum + value, 0)

    const averageMeasurementScore = measurementScore > 0 ? measurementScore / 3 : 0.5
    return clamp((labelScore + averageMeasurementScore) / 2)
  }

  if (bodyWaist && garmentWaist) {
    const delta = Math.abs(garmentWaist - bodyWaist)
    return clamp(1 - delta / 18)
  }

  if (numericSize !== null) {
    return clamp(1 - Math.abs(numericSize - bodySizeEstimate || 8) / 8)
  }

  return 0.7
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

    const sizeScore = getSizeMatchScore(item, profile)
    const base = count > 0 ? (measurementScore + sizeScore) / 2 : itemPreferenceScore
    return fitLabel ? clamp((base + itemPreferenceScore + sizeScore) / 3) : 0.5
  })

  const average = scores.reduce((sum, value) => sum + value, 0) / scores.length
  return Number(clamp(average).toFixed(3))
}
